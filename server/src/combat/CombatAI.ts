import { CombatState, CombatEntity, CombatAction, distanceTiles } from 'shared';
import { generateContent } from '../ai/openai';

/**
 * Decides what action an enemy mob should take.
 * Uses simple heuristics for regular mobs.
 */
export async function generateEnemyDecisions(
    state: CombatState,
    mob: CombatEntity
): Promise<CombatAction> {
    // Get all living players
    const livingPlayers = Object.values(state.entities).filter(
        e => e.type === 'PLAYER' && e.hp > 0
    );

    if (livingPlayers.length === 0) {
        return { type: 'END_TURN' } as CombatAction;
    }

    // Heuristic: find nearest player
    let nearestPlayer = livingPlayers[0];
    let nearestDist = distanceTiles(mob.position, nearestPlayer.position);

    for (const player of livingPlayers) {
        const dist = distanceTiles(mob.position, player.position);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearestPlayer = player;
        }
    }

    // If nearest is within melee range, attack them
    if (nearestDist <= 1.5) {
        return { type: 'MELEE_ATTACK', targetId: nearestPlayer.id } as CombatAction;
    }

    // Otherwise, move toward the nearest player
    const dx = nearestPlayer.position.x - mob.position.x;
    const dy = nearestPlayer.position.y - mob.position.y;
    const maxMove = 6; // Near distance

    // Move up to maxMove tiles toward the target
    let stepX = 0;
    if (dx !== 0) {
        stepX = dx > 0 ? Math.min(dx, maxMove) : Math.max(dx, -maxMove);
    }

    let stepY = 0;
    if (dy !== 0) {
        stepY = dy > 0 ? Math.min(dy, maxMove) : Math.max(dy, -maxMove);
    }

    const newX = mob.position.x + stepX;
    const newY = mob.position.y + stepY;

    // Check if we're now close enough to attack after moving
    const newDist = distanceTiles({ x: newX, y: newY }, nearestPlayer.position);

    if (newDist <= 1.5) {
        // Move then attack in the same turn
        mob.position = { x: newX, y: newY };
        return { type: 'MELEE_ATTACK', targetId: nearestPlayer.id } as CombatAction;
    }

    return { type: 'MOVE', moveTo: { x: newX, y: newY } } as CombatAction;
}

/**
 * Generates a narrative description for a combat action using AI.
 */
export async function generateCombatNarrative(
    actor: CombatEntity,
    target: CombatEntity,
    isHit: boolean,
    damage: number,
    isCritical: boolean,
    isFumble: boolean
): Promise<string> {
    // Fallback narratives if AI is unavailable
    const fallbackNarratives = {
        hit: [
            `${actor.name} strikes ${target.name} for ${damage} damage!`,
            `${actor.name}'s blow connects with ${target.name}, dealing ${damage} damage.`,
            `${actor.name} lands a solid hit on ${target.name} (${damage} dmg).`,
        ],
        miss: [
            `${actor.name} swings at ${target.name} but misses!`,
            `${target.name} dodges ${actor.name}'s attack.`,
            `${actor.name}'s attack glances harmlessly off ${target.name}'s armor.`,
        ],
        critical: [
            `⚡ CRITICAL HIT! ${actor.name} devastates ${target.name} for ${damage} damage!`,
            `⚡ ${actor.name} finds a weak spot! ${target.name} takes ${damage} critical damage!`,
        ],
        fumble: [
            `💀 FUMBLE! ${actor.name} stumbles, leaving an opening!`,
            `💀 ${actor.name}'s weapon slips from their grasp!`,
        ],
        kill: [
            `💀 ${actor.name} delivers the killing blow to ${target.name}!`,
            `💀 ${target.name} falls to the ground, defeated by ${actor.name}!`,
        ],
    };

    // Quick fallback selection
    const isKill = target.hp <= 0;
    let pool: string[];
    if (isKill) pool = fallbackNarratives.kill;
    else if (isFumble) pool = fallbackNarratives.fumble;
    else if (isCritical) pool = fallbackNarratives.critical;
    else if (isHit) pool = fallbackNarratives.hit;
    else pool = fallbackNarratives.miss;

    const fallback = pool[Math.floor(Math.random() * pool.length)];

    // Try AI narrative for richer descriptions
    try {
        const systemPrompt = `You are a grim, laconic dungeon master narrating combat in a dark fantasy RPG.
Write a single sentence (max 30 words) describing this combat action.
Style: Old school, terse, atmospheric. Mention sounds, smells, the weight of weapons.
Do NOT use markdown. Do NOT add quotes. Just the raw narrative sentence.`;

        const context = `${actor.name} (${actor.type === 'MOB' ? 'monster' : 'hero'}) attacks ${target.name}.
Result: ${isHit ? 'HIT' : 'MISS'}. ${isCritical ? 'CRITICAL HIT!' : ''} ${isFumble ? 'FUMBLE!' : ''}
Damage: ${damage}. Target HP: ${target.hp}/${target.maxHp}. ${isKill ? 'TARGET KILLED!' : ''}`;

        const result = await generateContent<{ narrative: string }>(systemPrompt, context);
        if (result?.narrative) return result.narrative;
    } catch (err) {
        // Fall through to fallback
    }

    return fallback;
}
