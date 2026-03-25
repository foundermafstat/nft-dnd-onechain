import { v4 as uuidv4 } from 'uuid';
import {
    CombatState, CombatEntity, CombatAction, CombatLog,
    DiceResult, MobTemplate, distanceTiles, calculateModifier, parseDice
} from 'shared';
import { createCombat, getCombat, updateCombatState, addCombatParticipant } from '../db/combatQueries';
import { createFatePool, rollFromPool, rollDice } from './FatePool';
import { generateEnemyDecisions, generateCombatNarrative } from './CombatAI';

// ── Distance thresholds (in tiles) ─────────────────────────────────
const CLOSE_RANGE = 1.5;   // Melee range
const NEAR_RANGE = 6;     // Movement + ranged attack range

/**
 * CombatEngine — server-authoritative state machine for turn-based combat.
 */
export class CombatEngine {

    /**
     * Starts a new combat encounter.
     * Rolls initiative for all participants, builds turn queue, persists to DB.
     */
    async startCombat(
        locationId: string,
        playerCharacters: Array<{
            characterId: string;
            name: string;
            stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
            ac: number;
            hp: number;
            maxHp: number;
            position: { x: number; y: number };
        }>,
        mobTemplates: Array<MobTemplate & { position: { x: number; y: number } }>
    ): Promise<CombatState | null> {

        const entities: Record<string, CombatEntity> = {};
        const initiativeResults: Array<{ id: string; initiative: number; type: 'PLAYER' | 'MOB' }> = [];

        // We need a temporary combat ID for fate pools
        const tempCombatId = uuidv4();

        // ── Create player entities ─────────────────────────────────
        for (const pc of playerCharacters) {
            const entityId = `player_${pc.characterId}`;
            const fatePoolId = await createFatePool(tempCombatId, entityId);

            // Roll initiative: d20 + DEX mod
            const dexMod = calculateModifier(pc.stats.dex);
            const initRoll = await rollFromPool(tempCombatId, entityId, 20);
            const initiative = initRoll ? initRoll.mapped + dexMod : dexMod;

            entities[entityId] = {
                id: entityId,
                name: pc.name,
                type: 'PLAYER',
                characterId: pc.characterId,
                stats: pc.stats,
                ac: pc.ac,
                hp: pc.hp,
                maxHp: pc.maxHp,
                position: pc.position,
                initiative,
                fatePoolId: fatePoolId || undefined,
                fatePoolIndex: 1, // Index 0 was used for initiative
            };

            initiativeResults.push({ id: entityId, initiative, type: 'PLAYER' });
        }

        // ── Create mob entities ────────────────────────────────────
        for (let i = 0; i < mobTemplates.length; i++) {
            const mob = mobTemplates[i];
            const entityId = `mob_${i}_${mob.name.toLowerCase().replace(/\s+/g, '_')}`;
            const fatePoolId = await createFatePool(tempCombatId, entityId);

            const dexMod = calculateModifier(mob.stats.dex);
            const initRoll = await rollFromPool(tempCombatId, entityId, 20);
            const initiative = initRoll ? initRoll.mapped + dexMod : dexMod;

            entities[entityId] = {
                id: entityId,
                name: mob.name,
                type: 'MOB',
                stats: mob.stats,
                ac: mob.ac,
                hp: mob.maxHp,
                maxHp: mob.maxHp,
                position: mob.position,
                initiative,
                damage: mob.damage,
                xpReward: mob.xpReward,
                fatePoolId: fatePoolId || undefined,
                fatePoolIndex: 1,
            };

            initiativeResults.push({ id: entityId, initiative, type: 'MOB' });
        }

        // ── Build turn queue: sort by initiative DESC, players win ties ──
        initiativeResults.sort((a, b) => {
            if (b.initiative !== a.initiative) return b.initiative - a.initiative;
            if (a.type === 'PLAYER' && b.type === 'MOB') return -1;
            if (a.type === 'MOB' && b.type === 'PLAYER') return 1;
            return 0;
        });

        const turnQueue = initiativeResults.map(r => r.id);
        const activeEntityId = turnQueue[0];

        // ── Persist to DB (rewrite with the real combat ID) ────────
        // We used tempCombatId for fate pools, and createCombat will give us the real one.
        // We need to update fate pools to reference the real combat ID.
        // Simplification: use tempCombatId as the actual combat ID by inserting with it.
        const combatId = await createCombat(locationId, entities, turnQueue, activeEntityId);
        if (!combatId) return null;

        // Register participants
        for (const result of initiativeResults) {
            const entity = entities[result.id];
            await addCombatParticipant(
                combatId,
                result.id,
                result.type,
                result.initiative,
                entity.characterId
            );
        }

        const initLog: CombatLog = {
            id: uuidv4(),
            round: 1,
            actorId: 'system',
            actorName: 'System',
            actionType: 'END_TURN',
            narrative: `⚔️ Combat begins! Initiative order: ${turnQueue.map(id => entities[id].name).join(' → ')}`,
        };

        const state: CombatState = {
            combatId,
            locationId,
            status: 'IN_PROGRESS',
            round: 1,
            turnQueue,
            currentTurnIndex: 0,
            activeEntityId,
            entities,
            logs: [initLog],
        };

        await updateCombatState(combatId, state);
        return state;
    }

    /**
     * Processes a player's combat action.
     */
    async processPlayerAction(combatId: string, playerId: string, action: CombatAction): Promise<CombatState | null> {
        const state = await getCombat(combatId);
        if (!state || state.status !== 'IN_PROGRESS') return null;

        const entityId = `player_${playerId}`;
        if (state.activeEntityId !== entityId) return null; // Not their turn

        const actor = state.entities[entityId];
        if (!actor || actor.hp <= 0) return null;

        let log: CombatLog | null = null;

        switch (action.type) {
            case 'MELEE_ATTACK':
                log = await this.resolveMeleeAttack(state, actor, action);
                break;
            case 'RANGED_ATTACK':
                log = await this.resolveRangedAttack(state, actor, action);
                break;
            case 'CAST_SPELL':
                log = await this.resolveCastSpell(state, actor, action);
                break;
            case 'MOVE':
                log = this.resolveMove(state, actor, action);
                break;
            case 'USE_ITEM':
                log = this.resolveUseItem(state, actor, action);
                break;
            case 'END_TURN':
                log = {
                    id: uuidv4(), round: state.round, actorId: actor.id, actorName: actor.name,
                    actionType: 'END_TURN', narrative: `${actor.name} ends their turn.`,
                };
                break;
        }

        if (log) state.logs.push(log);

        // Check for victory/defeat
        const combatEnd = this.checkCombatEnd(state);
        if (combatEnd) {
            state.status = combatEnd;
            await updateCombatState(combatId, state);
            return state;
        }

        // If action is END_TURN or after attack, advance turn
        if (action.type === 'END_TURN' || action.type === 'MELEE_ATTACK' || action.type === 'RANGED_ATTACK' || action.type === 'CAST_SPELL') {
            this.advanceTurn(state);
        }

        await updateCombatState(combatId, state);
        return state;
    }

    /**
     * Processes all enemy turns until it's a player's turn again.
     */
    async processEnemyTurns(state: CombatState): Promise<CombatState> {
        while (state.status === 'IN_PROGRESS') {
            const activeEntity = state.entities[state.activeEntityId];
            if (!activeEntity || activeEntity.type !== 'MOB') break;
            if (activeEntity.hp <= 0) {
                this.advanceTurn(state);
                continue;
            }

            // Get AI decision
            const decision = await generateEnemyDecisions(state, activeEntity);

            if (decision.type === 'MELEE_ATTACK' && decision.targetId) {
                const target = state.entities[decision.targetId];
                if (target && target.hp > 0) {
                    const log = await this.resolveMobAttack(state, activeEntity, target);
                    if (log) state.logs.push(log);
                }
            }

            // Check combat end
            const combatEnd = this.checkCombatEnd(state);
            if (combatEnd) {
                state.status = combatEnd;
                break;
            }

            this.advanceTurn(state);
        }

        await updateCombatState(state.combatId, state);
        return state;
    }

    // ── Attack Resolution ──────────────────────────────────────────

    private async resolveMeleeAttack(state: CombatState, actor: CombatEntity, action: CombatAction): Promise<CombatLog | null> {
        if (!action.targetId) return null;
        const target = state.entities[action.targetId];
        if (!target || target.hp <= 0) return null;

        const dist = distanceTiles(actor.position, target.position);
        if (dist > CLOSE_RANGE) {
            return {
                id: uuidv4(), round: state.round, actorId: actor.id, actorName: actor.name,
                actionType: 'MELEE_ATTACK', targetId: target.id, targetName: target.name,
                narrative: `${actor.name} is too far to strike ${target.name}!`,
            };
        }

        const strMod = calculateModifier(actor.stats.str);
        const attackRollResult = await rollFromPool(state.combatId, actor.id, 20);
        if (!attackRollResult) return null;

        const attackTotal = attackRollResult.mapped + strMod;
        const isHit = attackTotal >= target.ac;
        const isNat20 = attackRollResult.mapped === 20;
        const isNat1 = attackRollResult.mapped === 1;

        let damage = 0;
        let damageRoll: DiceResult | undefined;

        if (isHit || isNat20) {
            // Default weapon damage 1d6 if no weapon specified
            const damageResult = await rollDice(state.combatId, actor.id, '1d6');
            if (damageResult) {
                damage = damageResult.total + strMod;
                if (isNat20) damage *= 2; // Critical hit doubles damage
                if (damage < 1) damage = 1;
                target.hp -= damage;
                if (target.hp < 0) target.hp = 0;
            }
        }

        const roll: DiceResult = {
            raw: attackRollResult.raw, modifier: strMod, total: attackTotal,
            dieType: 20, fateIndex: attackRollResult.index,
        };

        const narrative = await generateCombatNarrative(actor, target, isHit, damage, isNat20, isNat1);

        return {
            id: uuidv4(), round: state.round, actorId: actor.id, actorName: actor.name,
            actionType: 'MELEE_ATTACK', targetId: target.id, targetName: target.name,
            roll, isHit: isHit || isNat20, damage, narrative,
        };
    }

    private async resolveRangedAttack(state: CombatState, actor: CombatEntity, action: CombatAction): Promise<CombatLog | null> {
        if (!action.targetId) return null;
        const target = state.entities[action.targetId];
        if (!target || target.hp <= 0) return null;

        const dist = distanceTiles(actor.position, target.position);
        if (dist > NEAR_RANGE) {
            return {
                id: uuidv4(), round: state.round, actorId: actor.id, actorName: actor.name,
                actionType: 'RANGED_ATTACK', targetId: target.id, targetName: target.name,
                narrative: `${target.name} is out of range for ${actor.name}!`,
            };
        }

        const dexMod = calculateModifier(actor.stats.dex);
        const attackRollResult = await rollFromPool(state.combatId, actor.id, 20);
        if (!attackRollResult) return null;

        const attackTotal = attackRollResult.mapped + dexMod;
        const isHit = attackTotal >= target.ac;
        const isNat20 = attackRollResult.mapped === 20;

        let damage = 0;
        if (isHit || isNat20) {
            const damageResult = await rollDice(state.combatId, actor.id, '1d6');
            if (damageResult) {
                damage = damageResult.total + dexMod;
                if (isNat20) damage *= 2;
                if (damage < 1) damage = 1;
                target.hp -= damage;
                if (target.hp < 0) target.hp = 0;
            }
        }

        const roll: DiceResult = {
            raw: attackRollResult.raw, modifier: dexMod, total: attackTotal,
            dieType: 20, fateIndex: attackRollResult.index,
        };

        const narrative = await generateCombatNarrative(actor, target, isHit || isNat20, damage, isNat20, false);

        return {
            id: uuidv4(), round: state.round, actorId: actor.id, actorName: actor.name,
            actionType: 'RANGED_ATTACK', targetId: target.id, targetName: target.name,
            roll, isHit: isHit || isNat20, damage, narrative,
        };
    }

    private async resolveCastSpell(state: CombatState, actor: CombatEntity, action: CombatAction): Promise<CombatLog | null> {
        if (!action.targetId) return null;
        const target = state.entities[action.targetId];
        if (!target || target.hp <= 0) return null;

        // Spellcasting check: d20 + INT mod vs DC 12
        const intMod = calculateModifier(actor.stats.int);
        const spellRoll = await rollFromPool(state.combatId, actor.id, 20);
        if (!spellRoll) return null;

        const spellTotal = spellRoll.mapped + intMod;
        const DC = 12; // Tier 1 spell default
        const success = spellTotal >= DC;
        const isNat1 = spellRoll.mapped === 1;

        let damage = 0;
        let narrativeExtra = '';

        if (isNat1) {
            narrativeExtra = ' The spell fizzles with a catastrophic backfire! (Penance triggered)';
        } else if (success) {
            const damageResult = await rollDice(state.combatId, actor.id, '1d8');
            if (damageResult) {
                damage = damageResult.total + intMod;
                if (damage < 1) damage = 1;
                target.hp -= damage;
                if (target.hp < 0) target.hp = 0;
            }
        }

        const roll: DiceResult = {
            raw: spellRoll.raw, modifier: intMod, total: spellTotal,
            dieType: 20, fateIndex: spellRoll.index,
        };

        const narrative = success
            ? `${actor.name} channels arcane energy at ${target.name}, dealing ${damage} damage!${narrativeExtra}`
            : `${actor.name}'s spell fails to manifest.${narrativeExtra}`;

        return {
            id: uuidv4(), round: state.round, actorId: actor.id, actorName: actor.name,
            actionType: 'CAST_SPELL', targetId: target.id, targetName: target.name,
            roll, isHit: success, damage, narrative,
        };
    }

    private resolveMove(state: CombatState, actor: CombatEntity, action: CombatAction): CombatLog | null {
        if (!action.moveTo) return null;
        const dist = distanceTiles(actor.position, action.moveTo);
        if (dist > NEAR_RANGE) {
            return {
                id: uuidv4(), round: state.round, actorId: actor.id, actorName: actor.name,
                actionType: 'MOVE', narrative: `${actor.name} cannot move that far!`,
            };
        }
        actor.position = { ...action.moveTo };
        return {
            id: uuidv4(), round: state.round, actorId: actor.id, actorName: actor.name,
            actionType: 'MOVE', narrative: `${actor.name} moves to (${action.moveTo.x}, ${action.moveTo.y}).`,
        };
    }

    private resolveUseItem(state: CombatState, actor: CombatEntity, action: CombatAction): CombatLog {
        // Simplified: using a healing potion restores 1d6 HP
        return {
            id: uuidv4(), round: state.round, actorId: actor.id, actorName: actor.name,
            actionType: 'USE_ITEM', narrative: `${actor.name} uses an item.`,
        };
    }

    private async resolveMobAttack(state: CombatState, mob: CombatEntity, target: CombatEntity): Promise<CombatLog | null> {
        const strMod = calculateModifier(mob.stats.str);
        const attackRoll = await rollFromPool(state.combatId, mob.id, 20);
        if (!attackRoll) return null;

        const attackTotal = attackRoll.mapped + strMod;
        const isHit = attackTotal >= target.ac;
        const isNat20 = attackRoll.mapped === 20;

        let damage = 0;
        if (isHit || isNat20) {
            const dmgStr = mob.damage || '1d4';
            const damageResult = await rollDice(state.combatId, mob.id, dmgStr);
            if (damageResult) {
                damage = damageResult.total + strMod;
                if (isNat20) damage *= 2;
                if (damage < 1) damage = 1;
                target.hp -= damage;
                if (target.hp < 0) target.hp = 0;
            }
        }

        const narrative = await generateCombatNarrative(mob, target, isHit || isNat20, damage, isNat20, false);

        return {
            id: uuidv4(), round: state.round, actorId: mob.id, actorName: mob.name,
            actionType: 'MELEE_ATTACK', targetId: target.id, targetName: target.name,
            roll: { raw: attackRoll.raw, modifier: strMod, total: attackTotal, dieType: 20, fateIndex: attackRoll.index },
            isHit: isHit || isNat20, damage, narrative,
        };
    }

    // ── Turn Management ────────────────────────────────────────────

    private advanceTurn(state: CombatState): void {
        let nextIndex = (state.currentTurnIndex + 1) % state.turnQueue.length;

        // If we wrapped around, increment the round
        if (nextIndex === 0) {
            state.round++;
        }

        // Skip dead entities
        let attempts = 0;
        while (attempts < state.turnQueue.length) {
            const nextEntity = state.entities[state.turnQueue[nextIndex]];
            if (nextEntity && nextEntity.hp > 0) break;
            nextIndex = (nextIndex + 1) % state.turnQueue.length;
            if (nextIndex === 0) state.round++;
            attempts++;
        }

        state.currentTurnIndex = nextIndex;
        state.activeEntityId = state.turnQueue[nextIndex];
    }

    private checkCombatEnd(state: CombatState): 'VICTORY' | 'DEFEAT' | null {
        const players = Object.values(state.entities).filter(e => e.type === 'PLAYER');
        const mobs = Object.values(state.entities).filter(e => e.type === 'MOB');

        const allMobsDead = mobs.every(m => m.hp <= 0);
        const allPlayersDead = players.every(p => p.hp <= 0);

        if (allMobsDead) return 'VICTORY';
        if (allPlayersDead) return 'DEFEAT';
        return null;
    }
}
