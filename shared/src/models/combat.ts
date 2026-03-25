// ── Combat System Models ────────────────────────────────────────────

// ── Action Types ────────────────────────────────────────────────────
export type CombatActionType =
    | 'MELEE_ATTACK'
    | 'RANGED_ATTACK'
    | 'CAST_SPELL'
    | 'USE_ITEM'
    | 'MOVE'
    | 'END_TURN';

// ── Player → Server action payload ─────────────────────────────────
export interface CombatAction {
    type: CombatActionType;
    targetId?: string;      // Entity being targeted
    weaponId?: string;      // Equipped weapon used
    spellId?: string;       // Ability / spell being cast
    itemId?: string;        // Consumable item
    moveTo?: { x: number; y: number }; // Destination tile
}

// ── Dice roll audit record ─────────────────────────────────────────
export interface DiceResult {
    raw: number;            // Value from Fate Pool
    modifier: number;       // Stat modifier applied
    total: number;          // raw + modifier
    dieType: number;        // 4, 6, 8, 10, 12, 20
    fateIndex: number;      // Index consumed from pool
}

// ── Single combat entity (player or mob) ───────────────────────────
export interface CombatEntity {
    id: string;
    name: string;
    type: 'PLAYER' | 'MOB';
    characterId?: string;   // Link to characters table (players only)

    stats: {
        str: number;
        dex: number;
        con: number;
        int: number;
        wis: number;
        cha: number;
    };
    ac: number;
    hp: number;
    maxHp: number;
    position: { x: number; y: number };
    initiative: number;     // Roll result for turn ordering

    // Fate Pool tracking
    fatePoolId?: string;
    fatePoolIndex: number;

    // Mob-specific
    damage?: string;        // e.g. '1d6', '2d4+2'
    xpReward?: number;
}

// ── Combat log entry ───────────────────────────────────────────────
export interface CombatLog {
    id: string;
    round: number;
    actorId: string;
    actorName: string;
    actionType: CombatActionType;
    targetId?: string;
    targetName?: string;
    roll?: DiceResult;
    damageRoll?: DiceResult;
    isHit?: boolean;
    damage?: number;
    narrative: string;      // AI-generated description
}

// ── Full combat session state ──────────────────────────────────────
export interface CombatState {
    combatId: string;
    locationId: string;
    status: 'INITIATIVE' | 'IN_PROGRESS' | 'VICTORY' | 'DEFEAT';
    round: number;
    turnQueue: string[];        // Entity IDs ordered by initiative
    currentTurnIndex: number;   // Index into turnQueue
    activeEntityId: string;     // Whose turn it is
    entities: Record<string, CombatEntity>;
    logs: CombatLog[];
}

// ── Mob template for spawning ──────────────────────────────────────
export interface MobTemplate {
    name: string;
    stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
    ac: number;
    maxHp: number;
    damage: string;         // e.g. '1d6'
    xpReward: number;
    spriteColor?: string;
}

// ── Helper: Euclidean tile distance ────────────────────────────────
export function distanceTiles(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Helper: Parse dice string → { count, sides, bonus } ───────────
export function parseDice(dice: string): { count: number; sides: number; bonus: number } {
    const match = dice.match(/^(\d+)?d(\d+)(?:\+(\d+))?$/i);
    if (!match) return { count: 1, sides: 6, bonus: 0 };
    return {
        count: parseInt(match[1] || '1', 10),
        sides: parseInt(match[2], 10),
        bonus: parseInt(match[3] || '0', 10),
    };
}
