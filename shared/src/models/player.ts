// Core Character Classes
export enum HeroClass {
    Fighter = 'Fighter',
    Priest = 'Priest',
    Thief = 'Thief',
    Wizard = 'Wizard',
}

// Core Attributes
export interface Attribute {
    value: number; // 3 to 18
    mod: number;   // Calculated modifier (-4 to +4)
}

export interface CharacterStats {
    str: Attribute; // Strength: For fighters, inventory slots
    dex: Attribute; // Dexterity: For thieves, initiative, AC
    con: Attribute; // Constitution: HP, death timer
    int: Attribute; // Intelligence: Wizards, stabilization
    wis: Attribute; // Wisdom: Priests
    cha: Attribute; // Charisma: Influence
}

// Health and active status
export interface CharacterStatus {
    hp_current: number;
    hp_max: number;
    ac: number;               // Armor Class: Base 10 + DEX mod (plus worn armor)
    is_dying: boolean;        // True if hp_current <= 0
    death_timer: number | null; // 1d4 + CON mod rounds (min 1) when dying
    luck_token: number;       // Max 1
}

// Abilities and features
export interface CharacterAbilities {
    ancestry_feature: string;
    class_features: string[];
    languages: string[];
}

// Inventory system
export interface InventoryItem {
    item: string;
    slots: number; // Usually 1
}

export interface Currency {
    gp: number;
    sp: number;
    cp: number;
}

export interface CharacterInventory {
    slots_total: number; // Max(STR, 10). Fighter gets +CON mod (if > 0)
    slots_used: number;
    gear: InventoryItem[];
    currency: Currency;  // First 100 free, then 1 slot per 100
}

// Light source mechanic
export interface LightSource {
    is_lit: boolean;
    remaining_time_seconds: number; // Max 3600 (1 hour real time)
}

// Full Player Data Model
export interface PlayerData {
    player_id: string; // Internal UUID
    identity: {
        name: string;
        ancestry: string;
        background: string;
        alignment: string;
        class: HeroClass;
        level: number;
        xp: number; // 0 to Level * 10
        title: string;
    };
    stats: CharacterStats;
    status: CharacterStatus;
    abilities: CharacterAbilities;
    inventory: CharacterInventory;
    light_source: LightSource;

    // Abstract grid positions or node IDs for where the player is in the world
    location?: {
        room_id: string;
        x: number;
        y: number;
    };
}
