// Context sent to the AI Storyteller
export interface PartyContext {
    partyLevel: number;
    characters: {
        id: string;
        name: string;
        class: string;
        stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
        hp: { current: number; max: number };
        keyItems: string[];
    }[];
    currentBiome: string;
    recentEvents: string[]; // From campaign_chronicles
}

// AI Output structure
export interface GeneratedScenario {
    narrativeDescription: string;
    location: {
        name: string;
        gridSize: { width: number; height: number };
        environmentHazards: string[];
    };
    npcs: GeneratedNPC[];
    puzzleOrTrap: PuzzleOrTrap;
    combatEncounter: CombatEncounter;
}

export interface GeneratedNPC {
    name: string;
    description: string;
    dialogStarter: string;
    motivation: string;
    isHostile: boolean;
}

export interface PuzzleOrTrap {
    exists: boolean;
    description?: string;
    requiredStat?: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
    difficultyClass?: number;
    successOutcome?: string;
    failOutcome?: string;
}

export interface CombatEncounter {
    exists: boolean;
    triggerDescription?: string;
    enemies?: GeneratedEnemy[];
}

export interface GeneratedEnemy {
    type: string;
    hp: number;
    ac: number;
    attacks: { name: string; damage: string; type: string }[];
    behavior: string;
}

// Database Chronicle Model
export interface ChronicleEntry {
    id: string;
    session_id?: string;
    location_id?: string;
    quest_id?: string;
    event_type: 'COMBAT_VICTORY' | 'PUZZLE_SOLVED' | 'NPC_INTERACTION' | 'STORY_MILESTONE' | 'TRAP_TRIGGERED';
    narrative: string;
    on_chain_hash?: string;
    created_at: string;
}
