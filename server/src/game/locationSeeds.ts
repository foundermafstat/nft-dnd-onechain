import { TileType as T, LocationMap } from 'shared';

// Shorthand aliases for readability in tile grids
const _ = T.Void;
const F = T.Floor;
const W = T.Wall;
const D = T.Door;
const C = T.Column;
const TB = T.Table;
const CH = T.Chair;
const BR = T.Barrel;
const CS = T.Chest;
const ST = T.Staircase;
const FP = T.Fireplace;
const BA = T.Bar;
const BD = T.Bed;
const BK = T.Bookshelf;
const CR = T.Crate;
const CF = T.Campfire;
const TR = T.Tree;
const WA = T.Water;
const RG = T.Rug;
const CB = T.Cobblestone;
const BRG = T.Bridge;

// === LOCATION UUIDs ===
const LOC_TAVERN = '00000000-0000-4000-a000-000000000001';
const LOC_DUNGEON = '00000000-0000-4000-a000-000000000002';
const LOC_FOREST = '00000000-0000-4000-a000-000000000003';
const LOC_STREET = '00000000-0000-4000-a000-000000000004';
const LOC_CHURCH = '00000000-0000-4000-a000-000000000005';
const LOC_WIZARD_SHOP = '00000000-0000-4000-a000-000000000006';
const LOC_CASTLE_GATE = '00000000-0000-4000-a000-000000000007';
const LOC_OUTSKIRTS = '00000000-0000-4000-a000-000000000008';
const LOC_RIVER_CROSSING = '00000000-0000-4000-a000-000000000009';

/**
 * 1. Tavern "The Dying Ember" — 20×16
 */
export const TAVERN_DYING_EMBER: LocationMap = {
    id: LOC_TAVERN,
    name: 'The Dying Ember',
    biome_type: 'HubRegion',
    room_type: 'SafeZone',
    width: 20,
    height: 16,
    threat_level: 0,
    spawn_points: [
        { x: 9, y: 14, label: 'entrance' },
        { x: 10, y: 14, label: 'entrance' },
        { x: 9, y: 13, label: 'from_street' },
        { x: 10, y: 13, label: 'from_street' },
    ],
    exits: [
        { tile_x: 9, tile_y: 15, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_tavern' },
        { tile_x: 10, tile_y: 15, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_tavern' },
    ],
    tiles: [
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
        [W, F, F, F, F, F, W, F, F, F, F, F, F, W, F, F, F, F, F, W],
        [W, F, FP, F, F, F, W, F, F, F, F, F, F, W, F, F, F, ST, F, W],
        [W, F, F, F, F, F, W, F, C, F, F, F, C, W, F, BD, F, F, F, W],
        [W, F, TB, CH, F, F, D, F, F, F, F, F, F, D, F, BD, F, BK, F, W],
        [W, F, CH, TB, F, F, W, F, F, RG, RG, F, F, W, F, F, F, F, F, W],
        [W, F, F, F, F, F, W, F, RG, RG, RG, RG, F, W, W, W, D, W, W, W],
        [W, F, TB, CH, F, F, D, F, F, RG, RG, F, F, F, F, F, F, F, F, W],
        [W, F, CH, TB, F, F, W, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, F, F, F, F, W, BA, BA, BA, BA, BA, F, F, F, TB, CH, CH, F, W],
        [W, F, C, F, F, F, W, F, F, F, F, F, F, F, F, CH, TB, F, F, W],
        [W, F, F, F, TB, CH, W, F, BR, F, BR, F, BR, F, F, F, F, F, F, W],
        [W, F, CH, F, CH, TB, D, F, F, F, F, F, F, F, CR, F, CR, F, F, W],
        [W, F, F, F, F, F, W, F, F, C, F, C, F, F, F, F, F, F, F, W],
        [W, W, W, W, W, W, W, W, W, D, D, W, W, W, W, W, W, W, W, W],
        [_, _, _, _, _, _, _, _, _, F, F, _, _, _, _, _, _, _, _, _],
    ],
};

/**
 * 2. Castle Street — 24×18, organic outdoor hub connecting all buildings
 */
export const CASTLE_STREET: LocationMap = {
    id: LOC_STREET,
    name: 'Castle Street',
    biome_type: 'HubRegion',
    room_type: 'SafeZone',
    width: 24,
    height: 18,
    threat_level: 0,
    spawn_points: [
        { x: 11, y: 3, label: 'from_tavern' },
        { x: 12, y: 3, label: 'from_tavern' },
        { x: 4, y: 9, label: 'from_church' },
        { x: 19, y: 9, label: 'from_wizard' },
        { x: 10, y: 16, label: 'from_gate' },
        { x: 11, y: 16, label: 'from_gate' },
        { x: 12, y: 16, label: 'from_gate' },
        { x: 13, y: 16, label: 'from_gate' },
    ],
    exits: [
        // North → Tavern (Façade entrance)
        { tile_x: 11, tile_y: 1, target_location_id: LOC_TAVERN, target_location_name: 'The Dying Ember', spawn_label: 'from_street' },
        { tile_x: 12, tile_y: 1, target_location_id: LOC_TAVERN, target_location_name: 'The Dying Ember', spawn_label: 'from_street' },
        // West → Church
        { tile_x: 2, tile_y: 8, target_location_id: LOC_CHURCH, target_location_name: 'Chapel of Ashes', spawn_label: 'from_street' },
        { tile_x: 2, tile_y: 9, target_location_id: LOC_CHURCH, target_location_name: 'Chapel of Ashes', spawn_label: 'from_street' },
        // East → Wizard Shop
        { tile_x: 21, tile_y: 8, target_location_id: LOC_WIZARD_SHOP, target_location_name: 'Arcane Emporium', spawn_label: 'from_street' },
        { tile_x: 21, tile_y: 9, target_location_id: LOC_WIZARD_SHOP, target_location_name: 'Arcane Emporium', spawn_label: 'from_street' },
        // South → Outskirts (Wide Gate - 4 tiles)
        { tile_x: 10, tile_y: 17, target_location_id: LOC_OUTSKIRTS, target_location_name: 'Castle Outskirts', spawn_label: 'from_street' },
        { tile_x: 11, tile_y: 17, target_location_id: LOC_OUTSKIRTS, target_location_name: 'Castle Outskirts', spawn_label: 'from_street' },
        { tile_x: 12, tile_y: 17, target_location_id: LOC_OUTSKIRTS, target_location_name: 'Castle Outskirts', spawn_label: 'from_street' },
        { tile_x: 13, tile_y: 17, target_location_id: LOC_OUTSKIRTS, target_location_name: 'Castle Outskirts', spawn_label: 'from_street' },
    ],
    tiles: [
        // Row 0  — Tavern Building Facade
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, W, W, W, W, W, W, TR, TR, TR, TR, TR, TR, TR, TR, TR], // 24
        // Row 1  — Tavern entrance (north)
        [TR, TR, TR, TR, TR, TR, TR, WA, WA, W, W, D, D, W, W, TR, TR, TR, TR, TR, TR, TR, TR, TR], // 24
        // Row 2  — Organic cobbled path expanding
        [TR, TR, TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, CB, TR, TR, TR, TR, TR, TR, TR, TR, TR], // 24
        // Row 3
        [TR, TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, WA, TR, TR, TR, TR, TR, TR], // 24
        // Row 4
        [TR, TR, TR, TR, TR, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, WA, TR, TR, TR, TR, TR], // 24
        // Row 5  — Campfires near water
        [TR, TR, TR, TR, WA, WA, CB, CB, CB, CF, CB, CB, CF, CB, CB, CB, CB, CB, WA, TR, TR, TR, TR, TR], // 24
        // Row 6  — Path branching
        [W, W, W, TR, TR, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, TR, TR, W, W, W], // 24
        // Row 7  — Church & Shop Facades on Left/Right
        [W, W, D, W, TR, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, TR, W, D, W, W], // 24
        // Row 8  — Church west, wizard east entrances
        [TR, TR, D, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, D, TR, TR], // 24
        // Row 9 
        [TR, TR, D, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, D, TR, TR], // 24
        // Row 10
        [W, W, D, W, TR, TR, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, TR, TR, W, D, W, W], // 24
        // Row 11
        [W, W, W, TR, TR, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, TR, TR, W, W, W], // 24
        // Row 12
        [TR, TR, TR, TR, WA, WA, CB, CB, CB, CF, CB, CB, CF, CB, CB, CB, CB, CB, WA, TR, TR, TR, TR, TR], // 24
        // Row 13
        [TR, TR, TR, TR, TR, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, WA, TR, TR, TR, TR, TR], // 24
        // Row 14
        [TR, TR, TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, CB, CB, WA, WA, TR, TR, TR, TR, TR, TR], // 24
        // Row 15 — Path narrowing to Castle Gate
        [TR, TR, TR, TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, TR, TR, TR, TR, TR, TR, TR, TR, TR], // 24
        // Row 16
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, W, CB, CB, CB, CB, W, TR, TR, TR, TR, TR, TR, TR, TR, TR], // 24
        // Row 17  — Broad castle gate south (4 tiles wide)
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, W, D, D, D, D, W, TR, TR, TR, TR, TR, TR, TR, TR, TR], // 24
    ],
};

/**
 * 3. Chapel of Ashes — 16×14
 */
export const CHAPEL_OF_ASHES: LocationMap = {
    id: LOC_CHURCH,
    name: 'Chapel of Ashes',
    biome_type: 'HubRegion',
    room_type: 'SafeZone',
    width: 16,
    height: 14,
    threat_level: 0,
    spawn_points: [
        { x: 13, y: 7, label: 'from_street' },
    ],
    exits: [
        { tile_x: 14, tile_y: 6, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_church' },
        { tile_x: 14, tile_y: 7, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_church' },
    ],
    tiles: [
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
        [W, F, F, F, F, F, C, F, F, C, F, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, C, F, F, F, F, FP, F, F, F, F, C, F, F, W],
        [W, F, F, F, CH, F, F, F, F, F, CH, F, F, F, F, W],
        [W, F, F, F, CH, F, F, RG, F, F, CH, F, F, F, F, W],
        [W, F, C, F, CH, F, F, RG, F, F, CH, F, C, F, D, W],
        [W, F, F, F, CH, F, F, F, F, F, CH, F, F, F, D, W],
        [W, F, F, F, CH, F, F, F, F, F, CH, F, F, F, F, W],
        [W, F, F, F, F, F, F, RG, F, F, F, F, F, F, F, W],
        [W, F, C, F, F, F, F, F, F, F, F, F, C, F, F, W],
        [W, F, F, F, F, BK, F, F, F, BK, F, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    ],
};

/**
 * 4. Arcane Emporium (Wizard Shop) — 16×14
 */
export const ARCANE_EMPORIUM: LocationMap = {
    id: LOC_WIZARD_SHOP,
    name: 'Arcane Emporium',
    biome_type: 'HubRegion',
    room_type: 'SafeZone',
    width: 16,
    height: 14,
    threat_level: 0,
    spawn_points: [
        { x: 2, y: 7, label: 'from_street' },
    ],
    exits: [
        { tile_x: 1, tile_y: 6, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_wizard' },
        { tile_x: 1, tile_y: 7, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_wizard' },
    ],
    tiles: [
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, F, BK, F, BK, F, F, F, BK, F, BK, F, F, F, W],
        [W, F, F, F, F, F, F, C, F, F, F, F, F, CS, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, BA, BA, BA, BA, F, F, F, F, CR, F, CR, F, F, W],
        [W, D, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, D, F, F, F, F, F, RG, F, F, F, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, F, BR, F, F, F, C, F, F, F, BR, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, CS, F, W],
        [W, F, F, BK, F, BK, F, F, F, BK, F, BK, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    ],
};

/**
 * 5. Castle Gate — 20×12, passage out of town
 */
export const CASTLE_GATE: LocationMap = {
    id: LOC_CASTLE_GATE,
    name: 'Castle Gate',
    biome_type: 'HubRegion',
    room_type: 'Corridor',
    width: 20,
    height: 12,
    threat_level: 1,
    spawn_points: [
        { x: 9, y: 2, label: 'from_street' },
        { x: 10, y: 2, label: 'from_street' },
        { x: 9, y: 10, label: 'from_outside' },
        { x: 10, y: 10, label: 'from_outside' },
    ],
    exits: [
        // North → back to Street
        { tile_x: 9, tile_y: 0, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_gate' },
        { tile_x: 10, tile_y: 0, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_gate' },
        // South → Hollow Crypts (dungeon, outside)
        { tile_x: 9, tile_y: 11, target_location_id: LOC_DUNGEON, target_location_name: 'Hollow Crypts', spawn_label: 'entrance' },
        { tile_x: 10, tile_y: 11, target_location_id: LOC_DUNGEON, target_location_name: 'Hollow Crypts', spawn_label: 'entrance' },
    ],
    tiles: [
        [W, W, W, W, W, W, W, W, W, D, D, W, W, W, W, W, W, W, W, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, F, F, C, F, F, F, F, F, F, F, F, F, F, C, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, W, W, W, F, F, F, F, F, F, F, F, F, F, F, F, W, W, W, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, CR, F, F, F, F, C, F, F, F, F, C, F, F, F, F, CR, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, W, W, W, F, F, F, F, F, F, F, F, F, F, F, F, W, W, W, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, F, F, C, F, F, F, F, F, F, F, F, F, F, C, F, F, F, W],
        [W, W, W, W, W, W, W, W, W, D, D, W, W, W, W, W, W, W, W, W],
    ],
};

/**
 * 6. Dungeon "Hollow Crypts" — 24×20 (existing, now with exit back to gate)
 */
export const DUNGEON_HOLLOW_CRYPTS: LocationMap = {
    id: LOC_DUNGEON,
    name: 'Hollow Crypts',
    biome_type: 'CrystalCaves',
    room_type: 'Arena',
    width: 24,
    height: 20,
    threat_level: 5,
    spawn_points: [
        { x: 1, y: 18, label: 'entrance' },
    ],
    exits: [
        { tile_x: 1, tile_y: 18, target_location_id: LOC_CASTLE_GATE, target_location_name: 'Castle Gate', spawn_label: 'from_outside' },
    ],
    tiles: [
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
        [W, F, F, F, F, F, F, C, F, F, F, F, F, F, C, F, F, F, F, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, CS, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, F, C, F, F, F, F, F, F, F, F, F, F, F, F, F, F, C, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, W, W, W, W, W, D, W, W, W, W, W, W, W, W, W, W, D, W, W, W, W, W, W],
        [W, F, F, F, F, F, F, F, F, F, W, CR, F, F, W, F, F, F, F, F, F, CR, F, W],
        [W, F, CR, F, F, W, W, W, F, F, W, F, F, F, W, F, F, W, W, W, F, F, F, W],
        [W, F, F, F, F, W, F, F, F, F, W, F, CS, F, W, F, F, F, F, W, F, F, F, W],
        [W, F, F, F, F, D, F, F, C, F, W, W, D, W, W, F, C, F, F, D, F, F, F, W],
        [W, F, F, F, F, W, F, F, F, F, F, F, F, F, F, F, F, F, F, W, F, F, F, W],
        [W, W, W, D, W, W, F, F, F, F, F, F, F, F, F, F, F, F, F, W, W, D, W, W],
        [W, F, F, F, F, W, W, W, W, W, W, D, W, W, W, W, W, W, W, W, F, F, F, W],
        [W, F, CS, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, BR, F, W],
        [W, F, F, F, F, W, W, W, W, F, C, F, F, C, F, W, W, W, W, W, F, F, F, W],
        [W, W, W, D, W, W, F, F, F, F, F, F, F, F, F, F, F, F, W, W, W, D, W, W],
        [W, F, F, F, F, F, F, F, W, F, F, F, F, F, F, W, F, F, F, F, F, F, F, W],
        [W, F, F, CR, F, F, F, F, W, F, F, C, F, F, F, W, F, F, F, F, CR, F, F, W],
        [W, D, F, F, F, F, F, F, W, W, W, W, D, W, W, W, F, F, F, F, F, F, D, W],
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    ],
};

/**
 * 7. Forest "Whisper Glade" — 28×22 (existing, standalone for quests)
 */
export const FOREST_WHISPER_GLADE: LocationMap = {
    id: LOC_FOREST,
    name: 'Whisper Glade',
    biome_type: 'DarkForest',
    room_type: 'SafeZone',
    width: 28,
    height: 22,
    threat_level: 2,
    spawn_points: [
        { x: 13, y: 20, label: 'south_path' },
        { x: 14, y: 20, label: 'south_path' },
        { x: 26, y: 10, label: 'from_river' },
        { x: 26, y: 11, label: 'from_river' },
    ],
    exits: [
        // East → River Crossing
        { tile_x: 27, tile_y: 10, target_location_id: LOC_RIVER_CROSSING, target_location_name: 'River Crossing', spawn_label: 'from_forest' },
        { tile_x: 27, tile_y: 11, target_location_id: LOC_RIVER_CROSSING, target_location_name: 'River Crossing', spawn_label: 'from_forest' },
    ],
    tiles: [
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, F, F, F, F, F, F, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, F, F, F, F, F, F, F, F, F, F, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, F, F, F, F, F, C, F, F, F, C, F, F, F, F, F, F, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, TR, TR, TR, TR],
        [TR, TR, TR, F, F, F, F, F, C, F, F, F, F, F, F, F, F, F, F, C, F, F, F, F, F, TR, TR, TR],
        [TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, TR, TR],
        [TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, TR],
        // Row 10 & 11: Path to the East (River Crossing) - 2 tiles wide
        [TR, TR, F, F, F, F, F, F, F, F, F, F, F, CF, CF, F, F, F, F, F, F, F, F, F, F, F, F, F],
        [TR, TR, F, F, F, F, F, F, F, F, F, F, F, CF, CF, F, F, F, F, F, F, F, F, F, F, F, F, F],
        [TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, TR],
        [TR, TR, F, F, F, F, F, CR, F, F, F, F, F, F, F, F, F, F, F, F, CR, F, F, F, F, F, TR, TR],
        [TR, TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, TR, TR, TR],
        [TR, TR, TR, F, F, F, F, F, F, C, F, F, F, F, F, F, F, F, C, F, F, F, F, F, F, TR, TR, TR],
        [TR, TR, TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, TR, F, F, F, F, F, F, F, F, F, F, F, F, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, F, F, F, F, F, F, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, F, F, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR],
    ],
};

/**
 * 8. Castle Outskirts — 24×15, connecting gate to wilderness and river
 */
export const CASTLE_OUTSKIRTS: LocationMap = {
    id: LOC_OUTSKIRTS,
    name: 'Castle Outskirts',
    biome_type: 'HubRegion',
    room_type: 'Corridor',
    width: 24,
    height: 15,
    threat_level: 1,
    spawn_points: [
        { x: 10, y: 2, label: 'from_street' },
        { x: 11, y: 2, label: 'from_street' },
        { x: 12, y: 2, label: 'from_street' },
        { x: 13, y: 2, label: 'from_street' },
        { x: 2, y: 7, label: 'from_river' },
        { x: 2, y: 8, label: 'from_river' },
        { x: 21, y: 7, label: 'from_dungeon' },
        { x: 21, y: 8, label: 'from_dungeon' },
    ],
    exits: [
        // North → Back to Castle Street
        { tile_x: 10, tile_y: 0, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_gate' },
        { tile_x: 11, tile_y: 0, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_gate' },
        { tile_x: 12, tile_y: 0, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_gate' },
        { tile_x: 13, tile_y: 0, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_gate' },
        // West → River Crossing
        { tile_x: 0, tile_y: 7, target_location_id: LOC_RIVER_CROSSING, target_location_name: 'River Crossing', spawn_label: 'from_outskirts' },
        { tile_x: 0, tile_y: 8, target_location_id: LOC_RIVER_CROSSING, target_location_name: 'River Crossing', spawn_label: 'from_outskirts' },
        // East → Hollow Crypts
        { tile_x: 23, tile_y: 7, target_location_id: LOC_DUNGEON, target_location_name: 'Hollow Crypts', spawn_label: 'entrance' },
        { tile_x: 23, tile_y: 8, target_location_id: LOC_DUNGEON, target_location_name: 'Hollow Crypts', spawn_label: 'entrance' },
    ],
    tiles: [
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, W, D, D, D, D, W, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, W, CB, CB, CB, CB, W, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, WA, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, WA, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, WA, CB, CB, CB, CB, CB, F, F, F, F, CB, CB, CB, CB, WA, TR, TR, TR, TR, TR],
        [TR, TR, TR, WA, CB, CB, CB, CB, CB, F, CF, F, F, CF, F, CB, CB, CB, CB, WA, TR, TR, TR, TR],
        [TR, TR, WA, CB, CB, CB, CB, CB, F, F, F, F, F, F, F, F, CB, CB, CB, CB, WA, TR, TR, TR],
        [D, CB, CB, CB, CB, CB, CB, F, F, F, F, F, F, F, F, F, F, CB, CB, CB, CB, CB, CB, D],
        [D, CB, CB, CB, CB, CB, CB, F, F, F, F, F, F, F, F, F, F, CB, CB, CB, CB, CB, CB, D],
        [TR, TR, WA, CB, CB, CB, CB, CB, F, F, F, F, F, F, F, F, CB, CB, CB, CB, WA, TR, TR, TR],
        [TR, TR, TR, WA, WA, CB, CB, CB, CB, F, F, F, F, F, F, CB, CB, CB, WA, WA, TR, TR, TR, TR],
        [TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, WA, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, WA, WA, WA, CB, CB, CB, CB, WA, WA, WA, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, WA, WA, WA, WA, WA, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR, TR],
    ],
};

/**
 * 9. River Crossing — 16×16, an environmental challenge with a bridge
 */
export const RIVER_CROSSING: LocationMap = {
    id: LOC_RIVER_CROSSING,
    name: 'River Crossing',
    biome_type: 'HubRegion',
    room_type: 'Corridor',
    width: 16,
    height: 16,
    threat_level: 2,
    spawn_points: [
        { x: 13, y: 7, label: 'from_outskirts' },
        { x: 13, y: 8, label: 'from_outskirts' },
        { x: 2, y: 7, label: 'from_forest' },
        { x: 2, y: 8, label: 'from_forest' },
    ],
    exits: [
        // East → Back to Outskirts
        { tile_x: 15, tile_y: 7, target_location_id: LOC_OUTSKIRTS, target_location_name: 'Castle Outskirts', spawn_label: 'from_river' },
        { tile_x: 15, tile_y: 8, target_location_id: LOC_OUTSKIRTS, target_location_name: 'Castle Outskirts', spawn_label: 'from_river' },
        // West → Whisper Glade Forest
        { tile_x: 0, tile_y: 7, target_location_id: LOC_FOREST, target_location_name: 'Whisper Glade', spawn_label: 'south_path' },
        { tile_x: 0, tile_y: 8, target_location_id: LOC_FOREST, target_location_name: 'Whisper Glade', spawn_label: 'south_path' },
    ],
    tiles: [
        [TR, TR, TR, TR, TR, TR, TR, WA, WA, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, WA, WA, WA, WA, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, WA, WA, WA, WA, WA, WA, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, WA, WA, WA, WA, WA, WA, WA, WA, TR, TR, TR, TR],
        [TR, TR, TR, WA, WA, WA, WA, WA, WA, WA, WA, WA, WA, TR, TR, TR],
        [TR, TR, CB, CB, WA, WA, WA, WA, WA, WA, WA, WA, CB, CB, TR, TR],
        [TR, CB, CB, CB, WA, WA, TR, WA, WA, TR, WA, WA, CB, CB, CB, TR],
        [D, CB, CB, CB, BRG, BRG, BRG, BRG, BRG, BRG, BRG, BRG, CB, CB, CB, D],
        [D, CB, CB, CB, BRG, BRG, BRG, BRG, BRG, BRG, BRG, BRG, CB, CB, CB, D],
        [TR, CB, CB, CB, WA, WA, TR, WA, WA, TR, WA, WA, CB, CB, CB, TR],
        [TR, TR, CB, CB, WA, WA, WA, WA, WA, WA, WA, WA, CB, CB, TR, TR],
        [TR, TR, TR, WA, WA, WA, WA, WA, WA, WA, WA, WA, WA, TR, TR, TR],
        [TR, TR, TR, TR, WA, WA, WA, WA, WA, WA, WA, WA, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, WA, WA, WA, WA, WA, WA, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, WA, WA, WA, WA, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, WA, WA, TR, TR, TR, TR, TR, TR, TR],
    ],
};

export const ALL_SEED_LOCATIONS: LocationMap[] = [
    TAVERN_DYING_EMBER,
    CASTLE_STREET,
    CHAPEL_OF_ASHES,
    ARCANE_EMPORIUM,
    CASTLE_GATE,
    DUNGEON_HOLLOW_CRYPTS,
    FOREST_WHISPER_GLADE,
    CASTLE_OUTSKIRTS,
    RIVER_CROSSING,
];
