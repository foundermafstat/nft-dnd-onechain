// ── Item Categories ─────────────────────────────────────────────────
export enum ItemCategory {
    Weapon = 'Weapon',
    Armor = 'Armor',
    Gear = 'Gear',
    Magic = 'Magic',
    Scroll = 'Scroll',
    Wand = 'Wand',
    QuestItem = 'QuestItem',
}

export enum ItemSubcategory {
    // Weapons
    Melee = 'Melee',
    Ranged = 'Ranged',
    // Armor
    Light = 'Light',
    Medium = 'Medium',
    Heavy = 'Heavy',
    Shield = 'Shield',
    // Gear
    LightSource = 'LightSource',
    Tool = 'Tool',
    Consumable = 'Consumable',
    Container = 'Container',
}

// ── Rarity ──────────────────────────────────────────────────────────
export enum ItemRarity {
    Common = 'Common',       // 60%
    Uncommon = 'Uncommon',   // 25%
    Rare = 'Rare',           // 10%
    Epic = 'Epic',           // 4%
    Legendary = 'Legendary', // 1%
}

// ── Blockchain status ───────────────────────────────────────────────
export enum BlockchainStatus {
    OffChain = 'OFF_CHAIN',
    Mintable = 'MINTABLE',
    Minted = 'MINTED',
}

// ── Weapon Properties (Shadowdark) ──────────────────────────────────
export type WeaponProperty = 'Finesse' | 'Versatile' | 'Thrown' | 'TwoHanded' | 'Loading';

// ── Stat Blocks ─────────────────────────────────────────────────────
export interface WeaponStats {
    damage: string;          // '1d4', '1d6', '1d8', '1d10', '1d12'
    range?: string;          // 'Close', 'Near', 'Far'
    properties?: WeaponProperty[];
    versatile_damage?: string; // Damage when two-handed
}

export interface ArmorStats {
    ac_base: number;         // Base AC value
    ac_dex: boolean;         // Whether DEX mod is added
    penalties?: string[];    // ['stealth', 'swimming']
}

export interface GearStats {
    duration_seconds?: number; // Torch = 3600 (1hr real time)
    light_range?: string;      // 'Near', 'DoubleNear'
    uses?: number;             // Consumable uses
    description?: string;      // Effect description
}

export interface MagicStats {
    spell?: string;
    charges?: number;
    break_on_nat1?: boolean;
}

// ── Rarity Bonuses ──────────────────────────────────────────────────
export interface ItemBonuses {
    attack_bonus?: number;
    damage_bonus?: number;
    ac_bonus?: number;
    save_bonus?: number;
}

// ── Full Item Interface ─────────────────────────────────────────────
export interface GameItem {
    id: string;
    name: string;
    base_type: string;
    category: ItemCategory;
    subcategory?: ItemSubcategory;
    rarity: ItemRarity;
    is_nft: boolean;
    blockchain_status: BlockchainStatus;
    stellar_token_id?: string;
    cost_gp: number;
    slots: number;
    stats: WeaponStats | ArmorStats | GearStats | MagicStats;
    bonuses: ItemBonuses;
    perks: string[];
    lore?: string;
    class_restrictions: string[];
    is_template: boolean;
    parent_template_id?: string;
    metadata?: Record<string, any>;
}
