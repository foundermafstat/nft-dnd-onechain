import { ANCESTRIES, Ancestry, HeroClass, calculateModifier } from 'shared';

export type Alignment = 'Lawful' | 'Neutral' | 'Chaotic';

export interface HeroSbtSnapshot {
  alignment: Alignment;
  deity: string;
  title: string;
  background: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  maxHp: number;
  armorClass: number;
  startingGoldGp: number;
  gearSlots: number;
  languages: string[];
  talents: string[];
  knownSpells: string[];
  ruleset: string;
}

export const COMMON_LANGUAGES = [
  'Common',
  'Dwarvish',
  'Elvish',
  'Giant',
  'Goblin',
  'Merran',
  'Orcish',
  'Reptilian',
  'Sylvan',
  'Thanian',
] as const;

export const RARE_LANGUAGES = ['Celestial', 'Diabolic', 'Draconic', 'Primordial'] as const;

export const DEITIES_BY_ALIGNMENT: Record<Alignment, string[]> = {
  Lawful: ['Saint Terragnis', 'Madeera the Covenant'],
  Neutral: ['Gede', 'Ord'],
  Chaotic: ['Memnon', 'Ramlaat', 'Shune the Vile'],
};

const LEVEL_1_TITLES: Record<HeroClass, Record<Alignment, string>> = {
  [HeroClass.Fighter]: {
    Lawful: 'Squire',
    Neutral: 'Warrior',
    Chaotic: 'Knave',
  },
  [HeroClass.Priest]: {
    Lawful: 'Acolyte',
    Neutral: 'Seeker',
    Chaotic: 'Initiate',
  },
  [HeroClass.Thief]: {
    Lawful: 'Footpad',
    Neutral: 'Robber',
    Chaotic: 'Thug',
  },
  [HeroClass.Wizard]: {
    Lawful: 'Apprentice',
    Neutral: 'Shaman',
    Chaotic: 'Adept',
  },
};

const BASE_CLASS_TALENTS: Record<HeroClass, string[]> = {
  [HeroClass.Fighter]: ['Hauler', 'Weapon Mastery', 'Grit', 'Class Talent Roll (pending)'],
  [HeroClass.Priest]: ['Turn Undead', 'Spellcasting (Priest)', 'Class Talent Roll (pending)'],
  [HeroClass.Thief]: ['Backstab', 'Thievery', 'Class Talent Roll (pending)'],
  [HeroClass.Wizard]: ['Learning Spells', 'Spellcasting (Wizard)', 'Class Talent Roll (pending)'],
};

const DEFAULT_PRIEST_LANGUAGE = 'Celestial';
const DEFAULT_WIZARD_COMMON = ['Dwarvish', 'Elvish'];
const DEFAULT_WIZARD_RARE = ['Draconic', 'Primordial'];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function randomDie(sides: number): number {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint32Array(1);
    window.crypto.getRandomValues(bytes);
    return (bytes[0] % sides) + 1;
  }
  return Math.floor(Math.random() * sides) + 1;
}

export function rollStartingGoldGp(): number {
  return (randomDie(6) + randomDie(6)) * 5;
}

export function defaultDeityForAlignment(alignment: Alignment): string {
  return DEITIES_BY_ALIGNMENT[alignment][0];
}

export function levelOneTitle(heroClass: HeroClass, alignment: Alignment): string {
  return LEVEL_1_TITLES[heroClass][alignment];
}

export function buildHeroSbtSnapshot(input: {
  heroClass: HeroClass;
  ancestry: Ancestry;
  alignment: Alignment;
  deity: string;
  background: string;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  maxHp: number;
  armorClass: number;
  startingGoldGp: number;
  humanExtraLanguage?: string;
  priestLanguage?: string;
  wizardCommonLanguages?: string[];
  wizardRareLanguages?: string[];
  knownSpells?: string[];
  extraTalents?: string[];
}): HeroSbtSnapshot {
  const baseAncestryLanguages = [...ANCESTRIES[input.ancestry].languages];

  if (input.ancestry === Ancestry.Human) {
    const fallbackLanguage = input.humanExtraLanguage?.trim() || 'Dwarvish';
    for (let i = baseAncestryLanguages.length - 1; i >= 0; i -= 1) {
      if (baseAncestryLanguages[i].toLowerCase().includes('one random')) {
        baseAncestryLanguages.splice(i, 1);
      }
    }
    baseAncestryLanguages.push(fallbackLanguage);
  }

  const classLanguages: string[] = [];
  if (input.heroClass === HeroClass.Priest) {
    classLanguages.push(input.priestLanguage?.trim() || DEFAULT_PRIEST_LANGUAGE);
  }
  if (input.heroClass === HeroClass.Wizard) {
    const wizardCommon = unique(input.wizardCommonLanguages ?? DEFAULT_WIZARD_COMMON).slice(0, 2);
    const wizardRare = unique(input.wizardRareLanguages ?? DEFAULT_WIZARD_RARE).slice(0, 2);
    classLanguages.push(...wizardCommon, ...wizardRare);
  }

  const talents = unique([
    ANCESTRIES[input.ancestry].feature,
    ...BASE_CLASS_TALENTS[input.heroClass],
    ...(input.ancestry === Ancestry.Human ? ['Bonus Talent Roll (Human Ambitious)'] : []),
    ...(input.extraTalents ?? []),
  ]);

  const defaultKnownSpells =
    input.heroClass === HeroClass.Priest
      ? ['Tier 1 Spell Slot #1 (pending)', 'Tier 1 Spell Slot #2 (pending)']
      : input.heroClass === HeroClass.Wizard
        ? ['Tier 1 Spell Slot #1 (pending)', 'Tier 1 Spell Slot #2 (pending)', 'Tier 1 Spell Slot #3 (pending)']
        : [];
  const selectedKnownSpells = unique(input.knownSpells ?? []);

  const conMod = calculateModifier(input.stats.con);
  const baseSlots = Math.max(input.stats.str, 10);
  const fighterBonusSlots = input.heroClass === HeroClass.Fighter && conMod > 0 ? conMod : 0;

  return {
    alignment: input.alignment,
    deity: input.deity,
    title: levelOneTitle(input.heroClass, input.alignment),
    background: input.background,
    strength: input.stats.str,
    dexterity: input.stats.dex,
    constitution: input.stats.con,
    intelligence: input.stats.int,
    wisdom: input.stats.wis,
    charisma: input.stats.cha,
    maxHp: input.maxHp,
    armorClass: input.armorClass,
    startingGoldGp: input.startingGoldGp,
    gearSlots: baseSlots + fighterBonusSlots,
    languages: unique([...baseAncestryLanguages, ...classLanguages]),
    talents,
    knownSpells: selectedKnownSpells.length ? selectedKnownSpells : defaultKnownSpells,
    ruleset: 'Shadowdark-Quickstart-v1',
  };
}
