import { HeroClass, CharacterStats } from './player';

// --- STAT MODIFIER CALCULATION ---
/**
 * Calculates the stat modifier based on the raw 3-18 value
 * 1-3: -4 | 4-5: -3 | 6-7: -2 | 8-9: -1 | 10-11: 0 | 12-13: +1 | 14-15: +2 | 16-17: +3 | 18+: +4
 */
export function calculateModifier(value: number): number {
    if (value <= 3) return -4;
    if (value <= 5) return -3;
    if (value <= 7) return -2;
    if (value <= 9) return -1;
    if (value <= 11) return 0;
    if (value <= 13) return 1;
    if (value <= 15) return 2;
    if (value <= 17) return 3;
    return 4;
}

// --- CONSTANTS AND DCs ---
export const DifficultyClass = {
    EASY: 9,
    NORMAL: 12,
    HARD: 15,
    EXTREME: 18,
};

// Abstract distances for web mechanics
export enum Distance {
    CLOSE = 'Close', // 5 feet (1.5m)
    NEAR = 'Near',   // 30 feet (9m) - standard move
    FAR = 'Far',     // Line of sight
}

// Gameplay Constants
export const GameplayConstants = {
    TORCH_DURATION_SECONDS: 3600, // 1 hour real-time
    MAX_LUCK_TOKENS: 1,
    CURRENCY_SLOT_DENOMINATION: 100, // First 100 free, then 1 slot per 100 coins
    BASE_AC: 10,
};

// --- CLASS CONFIGURATION ---
export interface ClassConfig {
    hitDie: number; // e.g., 8 for 1d8
    weapons: string;
    armor: string;
}

export const CLASS_MODIFIERS: Record<HeroClass, ClassConfig> = {
    [HeroClass.Fighter]: {
        hitDie: 8,
        weapons: 'Any',
        armor: 'Any + Shields',
    },
    [HeroClass.Priest]: {
        hitDie: 6,
        weapons: 'Limited',
        armor: 'Any + Shields',
    },
    [HeroClass.Thief]: {
        hitDie: 4,
        weapons: 'Limited',
        armor: 'Leather',
    },
    [HeroClass.Wizard]: {
        hitDie: 4,
        weapons: 'Dagger, Staff',
        armor: 'None',
    },
};

// --- HELPER FUNCTIONS ---

/**
 * Calculates total inventory slots based on STR, checking for Fighter class bonus.
 */
export function calculateMaxInventorySlots(stats: CharacterStats, heroClass: HeroClass): number {
    let slots = Math.max(stats.str.value, 10);

    // Fighter exception: +CON mod if positive
    if (heroClass === HeroClass.Fighter && stats.con.mod > 0) {
        slots += stats.con.mod;
    }

    return slots;
}

/**
 * XP Required for the next level
 */
export function xpForNextLevel(currentLevel: number): number {
    return currentLevel * 10;
}

// --- ANCESTRIES ---
export enum Ancestry {
    Dwarf = 'Dwarf',
    Elf = 'Elf',
    Goblin = 'Goblin',
    Halfling = 'Halfling',
    HalfOrc = 'HalfOrc',
    Human = 'Human'
}

export const ANCESTRIES = {
    [Ancestry.Dwarf]: { name: 'Dwarf', feature: 'Stout', description: '+2 HP at start. Roll hit points with advantage at every level.', languages: ['Common', 'Dwarvish'] },
    [Ancestry.Elf]: { name: 'Elf', feature: 'Farsight', description: '+1 bonus to ranged weapon attacks or spellcasting checks.', languages: ['Common', 'Elvish', 'Sylvan'] },
    [Ancestry.Goblin]: { name: 'Goblin', feature: 'Keen Senses', description: 'Cannot be caught by surprise.', languages: ['Common', 'Goblin'] },
    [Ancestry.Halfling]: { name: 'Halfling', feature: 'Stealthy', description: 'Once per day, become invisible for 3 rounds.', languages: ['Common'] },
    [Ancestry.HalfOrc]: { name: 'Half-Orc', feature: 'Mighty', description: '+1 to attack and damage rolls with melee weapons.', languages: ['Common', 'Orcish'] },
    [Ancestry.Human]: { name: 'Human', feature: 'Ambitious', description: 'Gain one additional talent roll at 1st level.', languages: ['Common', 'One Random'] }
};
