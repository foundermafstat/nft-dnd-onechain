import { HeroClass } from './player';
import { Ancestry, calculateModifier } from './rules';

export const SHADOWDARK_STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type ShadowdarkStatKey = (typeof SHADOWDARK_STAT_KEYS)[number];
export type ShadowdarkStats = Record<ShadowdarkStatKey, number>;
export type ShadowdarkStatLimits = Record<ShadowdarkStatKey, { min: number; max: number }>;

export const SHADOWDARK_STAT_MIN = 3;
export const SHADOWDARK_STAT_MAX = 18;
export const SHADOWDARK_REROLL_THRESHOLD = 14;
export const SHADOWDARK_STRICT_MAX_ATTEMPTS = 500;
export const SHADOWDARK_POINT_BUY_TOTAL = 72;

export const SHADOWDARK_ANCESTRY_SLOT_MODIFIER: Record<Ancestry, number> = {
    [Ancestry.Dwarf]: 0,
    [Ancestry.Elf]: 0,
    [Ancestry.Goblin]: 0,
    [Ancestry.Halfling]: 0,
    [Ancestry.HalfOrc]: 0,
    [Ancestry.Human]: 0,
};

export function baseStatLimits(): ShadowdarkStatLimits {
    return {
        str: { min: SHADOWDARK_STAT_MIN, max: SHADOWDARK_STAT_MAX },
        dex: { min: SHADOWDARK_STAT_MIN, max: SHADOWDARK_STAT_MAX },
        con: { min: SHADOWDARK_STAT_MIN, max: SHADOWDARK_STAT_MAX },
        int: { min: SHADOWDARK_STAT_MIN, max: SHADOWDARK_STAT_MAX },
        wis: { min: SHADOWDARK_STAT_MIN, max: SHADOWDARK_STAT_MAX },
        cha: { min: SHADOWDARK_STAT_MIN, max: SHADOWDARK_STAT_MAX },
    };
}

export function getProfileStatLimits(heroClass: HeroClass, ancestry: Ancestry): ShadowdarkStatLimits {
    const l = baseStatLimits();

    // Project-locked class profile floors.
    if (heroClass === HeroClass.Fighter) l.str.min = 12;
    if (heroClass === HeroClass.Priest) l.wis.min = 12;
    if (heroClass === HeroClass.Thief) l.dex.min = 12;
    if (heroClass === HeroClass.Wizard) l.int.min = 12;

    // Project-locked ancestry profile constraints.
    switch (ancestry) {
        case Ancestry.Dwarf:
            l.con.min = Math.max(l.con.min, 10);
            l.dex.max = Math.min(l.dex.max, 14);
            break;
        case Ancestry.Elf:
            l.dex.min = Math.max(l.dex.min, 10);
            l.con.max = Math.min(l.con.max, 14);
            break;
        case Ancestry.Goblin:
            l.str.max = Math.min(l.str.max, 12);
            break;
        case Ancestry.Halfling:
            l.str.max = Math.min(l.str.max, 10);
            break;
        case Ancestry.HalfOrc:
            l.str.min = Math.max(l.str.min, 10);
            l.int.max = Math.min(l.int.max, 14);
            break;
        case Ancestry.Human:
            break;
    }

    for (const key of SHADOWDARK_STAT_KEYS) {
        if (l[key].min > l[key].max) l[key].min = l[key].max;
    }

    return l;
}

export function clampStatsToLimits(
    stats: ShadowdarkStats,
    limits: ShadowdarkStatLimits,
): { stats: ShadowdarkStats; changed: boolean } {
    const next: ShadowdarkStats = { ...stats };
    let changed = false;
    for (const key of SHADOWDARK_STAT_KEYS) {
        if (next[key] < limits[key].min) {
            next[key] = limits[key].min;
            changed = true;
        }
        if (next[key] > limits[key].max) {
            next[key] = limits[key].max;
            changed = true;
        }
    }
    return { stats: next, changed };
}

export function statsMeetLimits(stats: ShadowdarkStats, limits: ShadowdarkStatLimits): boolean {
    return SHADOWDARK_STAT_KEYS.every((key) => stats[key] >= limits[key].min && stats[key] <= limits[key].max);
}

function d6(rng: () => number): number {
    return Math.floor(rng() * 6) + 1;
}

export function roll3d6(rng: () => number = Math.random): number {
    return d6(rng) + d6(rng) + d6(rng);
}

export function rollCandidateStats(rng: () => number = Math.random): ShadowdarkStats {
    return {
        str: roll3d6(rng),
        dex: roll3d6(rng),
        con: roll3d6(rng),
        int: roll3d6(rng),
        wis: roll3d6(rng),
        cha: roll3d6(rng),
    };
}

export function hasStatAtLeast(stats: ShadowdarkStats, threshold: number): boolean {
    return SHADOWDARK_STAT_KEYS.some((key) => stats[key] >= threshold);
}

export function rollValidQuickstartStats(params: {
    heroClass: HeroClass;
    ancestry: Ancestry;
    maxAttempts?: number;
    rerollThreshold?: number;
    rng?: () => number;
}): { stats: ShadowdarkStats; attempts: number; limits: ShadowdarkStatLimits } {
    const {
        heroClass,
        ancestry,
        maxAttempts = SHADOWDARK_STRICT_MAX_ATTEMPTS,
        rerollThreshold = SHADOWDARK_REROLL_THRESHOLD,
        rng = Math.random,
    } = params;

    const limits = getProfileStatLimits(heroClass, ancestry);
    let attempts = 0;
    let stats = rollCandidateStats(rng);
    while (attempts < maxAttempts) {
        attempts += 1;
        if (!hasStatAtLeast(stats, rerollThreshold)) {
            stats = rollCandidateStats(rng);
            continue;
        }
        if (!statsMeetLimits(stats, limits)) {
            stats = rollCandidateStats(rng);
            continue;
        }
        return { stats, attempts, limits };
    }
    throw new Error('Failed to roll valid quickstart stats for profile');
}

export function calculateGearSlotsForProfile(params: {
    str: number;
    con: number;
    heroClass: HeroClass;
    ancestry: Ancestry;
}): { total: number; base: number; classModifier: number; ancestryModifier: number } {
    const base = Math.max(params.str, 10);
    const classModifier =
        params.heroClass === HeroClass.Fighter ? Math.max(0, calculateModifier(params.con)) : 0;
    const ancestryModifier = SHADOWDARK_ANCESTRY_SLOT_MODIFIER[params.ancestry] ?? 0;
    const total = Math.max(1, base + classModifier + ancestryModifier);
    return { total, base, classModifier, ancestryModifier };
}
