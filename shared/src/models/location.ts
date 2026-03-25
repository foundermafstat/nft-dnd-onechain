// Tile types for schematic dungeon/location rendering
export enum TileType {
    Void = 0,        // Empty / out-of-bounds
    Floor = 1,       // Walkable stone floor
    Wall = 2,        // Impassable wall
    Door = 3,        // Passable doorway
    Column = 4,      // Decorative pillar (impassable)
    Table = 5,       // Furniture (impassable)
    Chair = 6,       // Furniture (passable)
    Barrel = 7,      // Container (impassable)
    Chest = 8,       // Loot container (impassable)
    Staircase = 9,   // Zone transition
    Fireplace = 10,  // Light source (impassable)
    Bar = 11,        // Tavern counter (impassable)
    Bed = 12,        // Furniture (impassable)
    Bookshelf = 13,  // Furniture (impassable)
    Crate = 14,      // Container (impassable)
    Campfire = 15,   // Outdoor light source (impassable)
    Tree = 16,       // Outdoor wall equivalent (impassable)
    Water = 17,      // Impassable terrain
    Rug = 18,        // Decorative floor (passable)
    Cobblestone = 19,// Outdoor stone path (passable)
    Bridge = 20,     // Wooden bridge over water (passable)
}

// Which tiles can be walked on
export const WALKABLE_TILES = new Set<TileType>([
    TileType.Floor,
    TileType.Door,
    TileType.Chair,
    TileType.Staircase,
    TileType.Rug,
    TileType.Cobblestone,
    TileType.Bridge,
]);

export interface SpawnPoint {
    x: number;
    y: number;
    label?: string; // e.g. 'entrance', 'boss_spawn', 'from_street'
}

export interface LocationExit {
    tile_x: number;
    tile_y: number;
    target_location_id: string;
    target_location_name: string;
    spawn_label: string; // which spawn point to land on in destination
}

export interface LocationMap {
    id: string;
    name: string;
    biome_type: string;
    room_type: string;
    width: number;
    height: number;
    tiles: TileType[][];   // [row][col] — tiles[y][x]
    spawn_points: SpawnPoint[];
    exits: LocationExit[];
    threat_level: number;
}
