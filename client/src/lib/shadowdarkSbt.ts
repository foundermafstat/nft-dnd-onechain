import { ANCESTRIES, Ancestry, HeroClass, calculateGearSlotsForProfile } from 'shared';

export type Alignment = 'Lawful' | 'Neutral' | 'Chaotic';

export interface HeroSbtSnapshot {
  heroClass: HeroClass;
  ancestry: Ancestry;
  level: number;
  xp: number;
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
  gearSlotsUsed: number;
  gearSlotsFree: number;
  ancestryGearSlotModifier: number;
  classGearSlotModifier: number;
  starterInventory: StarterInventoryItem[];
  commonCarryRules: string[];
  loreScore: number;
  languages: string[];
  talents: string[];
  knownSpells: string[];
  ruleset: string;
  snapshotVersion: string;
}

export interface StarterInventoryItem {
  key: string;
  name: string;
  quantity: number;
  slotsPerUnit: number;
  totalSlots: number;
  category: 'weapon' | 'armor' | 'shield' | 'tool' | 'consumable' | 'class-kit' | 'currency';
  notes?: string;
}

export interface AdventureInventoryDelta {
  add?: StarterInventoryItem[];
  removeKeys?: string[];
  consumedKeys?: string[];
  goldDeltaGp?: number;
}

export interface AdventureProgressDelta {
  xpDelta?: number;
  levelDelta?: number;
  loreScoreDelta?: number;
  updatedKnownSpells?: string[];
  updatedTalents?: string[];
  inventoryDelta?: AdventureInventoryDelta;
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

export const QUICKSTART_BACKGROUNDS = [
  "Urchin. You grew up in the merciless streets of a large city",
  "Wanted. There's a price on your head, but you have allies",
  'Cult Initiate. You know blasphemous secrets and rituals',
  "Thieves' Guild. You have connections, contacts, and debts",
  'Banished. Your people cast you out for supposed crimes',
  'Orphaned. An unusual guardian rescued and raised you',
  "Wizard's Apprentice. You have a knack and eye for magic",
  'Jeweler. You can easily appraise value and authenticity',
  'Herbalist. You know plants, medicines, and poisons',
  'Barbarian. You left the horde, but it never quite left you',
  'Mercenary. You fought friend and foe alike for your coin',
  "Sailor. Pirate, privateer, or merchant - the seas are yours",
  "Acolyte. You're well trained in religious rites and doctrines",
  'Soldier. You served as a fighter in an organized army',
  'Ranger. The woods and wilds are your true home',
  'Scout. You survived on stealth, observation, and speed',
  "Minstrel. You've traveled far with your charm and talent",
  'Scholar. You know much about ancient history and lore',
  'Noble. A famous name has opened many doors for you',
  'Chirurgeon. You know anatomy, surgery, and first aid',
] as const;

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
const QUICKSTART_RULESET = 'Shadowdark-Quickstart-Strict-v2';

const STARTER_INVENTORY_BY_CLASS: Record<HeroClass, StarterInventoryItem[]> = {
  [HeroClass.Fighter]: [
    { key: 'longsword', name: 'Longsword', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'weapon' },
    { key: 'shield', name: 'Shield', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'shield' },
    { key: 'leather-armor', name: 'Leather Armor', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'armor' },
    { key: 'torch', name: 'Torch', quantity: 2, slotsPerUnit: 1, totalSlots: 2, category: 'consumable' },
    { key: 'rations', name: 'Rations', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'consumable', notes: 'Represents 3 days pack' },
    { key: 'rope', name: "Rope, 60'", quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'tool' },
  ],
  [HeroClass.Priest]: [
    { key: 'mace', name: 'Mace', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'weapon' },
    { key: 'shield', name: 'Shield', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'shield' },
    { key: 'leather-armor', name: 'Leather Armor', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'armor' },
    { key: 'holy-symbol', name: 'Holy Symbol', quantity: 1, slotsPerUnit: 0, totalSlots: 0, category: 'class-kit', notes: 'Class feature item (free slot)' },
    { key: 'torch', name: 'Torch', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'consumable' },
    { key: 'rations', name: 'Rations', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'consumable', notes: 'Represents 3 days pack' },
  ],
  [HeroClass.Thief]: [
    { key: 'shortsword', name: 'Shortsword', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'weapon' },
    { key: 'dagger', name: 'Dagger', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'weapon' },
    { key: 'leather-armor', name: 'Leather Armor', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'armor' },
    { key: 'thieves-tools', name: "Thieves' Tools", quantity: 1, slotsPerUnit: 0, totalSlots: 0, category: 'class-kit', notes: 'Class feature tools (free slot)' },
    { key: 'rope', name: "Rope, 60'", quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'tool' },
    { key: 'torch', name: 'Torch', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'consumable' },
  ],
  [HeroClass.Wizard]: [
    { key: 'staff', name: 'Staff', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'weapon' },
    { key: 'dagger', name: 'Dagger', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'weapon' },
    { key: 'spellbook', name: 'Spellbook', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'class-kit' },
    { key: 'scroll-magic-missile', name: 'Scroll of Magic Missile', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'consumable' },
    { key: 'torch', name: 'Torch', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'consumable' },
    { key: 'rations', name: 'Rations', quantity: 1, slotsPerUnit: 1, totalSlots: 1, category: 'consumable', notes: 'Represents 3 days pack' },
  ],
};

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

  const slots = calculateGearSlotsForProfile({
    str: input.stats.str,
    con: input.stats.con,
    heroClass: input.heroClass,
    ancestry: input.ancestry,
  });
  const gearSlots = slots.total;
  const ancestrySlotModifier = slots.ancestryModifier;
  const fighterBonusSlots = slots.classModifier;
  const starterInventory = STARTER_INVENTORY_BY_CLASS[input.heroClass].map((item) => ({ ...item }));
  const gearSlotsUsed = starterInventory.reduce((sum, item) => sum + item.totalSlots, 0);
  const gearSlotsFree = Math.max(0, gearSlots - gearSlotsUsed);

  return {
    heroClass: input.heroClass,
    ancestry: input.ancestry,
    level: 1,
    xp: 0,
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
    gearSlots,
    gearSlotsUsed,
    gearSlotsFree,
    ancestryGearSlotModifier: ancestrySlotModifier,
    classGearSlotModifier: fighterBonusSlots,
    starterInventory,
    commonCarryRules: [
      'Carry capacity = max(Strength, 10) + class slot modifiers.',
      'First 100 coins are free to carry (0 slots).',
      'Backpack: first one is free to carry.',
      'Class feature tools/holy symbols may occupy 0 slots as noted.',
    ],
    loreScore: 0,
    languages: unique([...baseAncestryLanguages, ...classLanguages]),
    talents,
    knownSpells: selectedKnownSpells.length ? selectedKnownSpells : defaultKnownSpells,
    ruleset: QUICKSTART_RULESET,
    snapshotVersion: 'hero-sbt-v2',
  };
}

export function applyAdventureProgressToHeroSnapshot(
  snapshot: HeroSbtSnapshot,
  delta: AdventureProgressDelta
): HeroSbtSnapshot {
  const removedKeys = new Set((delta.inventoryDelta?.removeKeys ?? []).map((key) => key.trim()));
  const consumedKeys = new Set((delta.inventoryDelta?.consumedKeys ?? []).map((key) => key.trim()));
  const remaining = snapshot.starterInventory
    .filter((item) => !removedKeys.has(item.key))
    .map((item) => {
      if (!consumedKeys.has(item.key) || item.quantity <= 1) return item;
      const nextQuantity = Math.max(1, item.quantity - 1);
      const totalSlots = nextQuantity * item.slotsPerUnit;
      return { ...item, quantity: nextQuantity, totalSlots };
    });
  const added = (delta.inventoryDelta?.add ?? []).map((item) => ({
    ...item,
    totalSlots: item.quantity * item.slotsPerUnit,
  }));
  const starterInventory = [...remaining, ...added];
  const gearSlotsUsed = starterInventory.reduce((sum, item) => sum + item.totalSlots, 0);
  const gearSlotsFree = Math.max(0, snapshot.gearSlots - gearSlotsUsed);
  const nextGold = Math.max(0, snapshot.startingGoldGp + (delta.inventoryDelta?.goldDeltaGp ?? 0));

  return {
    ...snapshot,
    level: snapshot.level + Math.max(0, delta.levelDelta ?? 0),
    xp: snapshot.xp + Math.max(0, delta.xpDelta ?? 0),
    loreScore: snapshot.loreScore + Math.max(0, delta.loreScoreDelta ?? 0),
    startingGoldGp: nextGold,
    gearSlotsUsed,
    gearSlotsFree,
    starterInventory,
    knownSpells: delta.updatedKnownSpells ? unique(delta.updatedKnownSpells) : snapshot.knownSpells,
    talents: delta.updatedTalents ? unique(delta.updatedTalents) : snapshot.talents,
  };
}
