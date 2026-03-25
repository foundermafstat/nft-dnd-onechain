export enum BiomeType {
    DarkForest = 'DarkForest',
    CrystalCaves = 'CrystalCaves',
    JailBiome = 'JailBiome',
    HubRegion = 'HubRegion',
    Ruins = 'Ruins'
}

export enum RoomType {
    Arena = 'Arena',
    PuzzleRoom = 'PuzzleRoom',
    TreasureRoom = 'TreasureRoom',
    Corridor = 'Corridor',
    SafeZone = 'SafeZone'
}

export interface WorldConstants {
    PHYSICS_TICK_RATE_MS: number; // For 10-20 TPS (e.g., 50ms)
    AI_DIRECTOR_TICK_MS: number;  // For 1 time per 5 seconds (5000ms)
    WORLD_UPDATER_TICK_MS: number;// For 1 time per 60 seconds (60000ms)
    MAX_PLAYERS_PER_HUB: number;  // Soft cap = 100
    DEAD_END_FALLBACK_MINUTES: number; // 10 mins
}

export const GAME_CONSTANTS: WorldConstants = {
    PHYSICS_TICK_RATE_MS: 50,
    AI_DIRECTOR_TICK_MS: 5000,
    WORLD_UPDATER_TICK_MS: 60000,
    MAX_PLAYERS_PER_HUB: 100,
    DEAD_END_FALLBACK_MINUTES: 10,
};
