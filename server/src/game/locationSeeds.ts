import { TileType as T, LocationMap } from 'shared';
import { generateLocationMap, ExitSpec, IncomingSpawn } from './mapGenerator';

// Shorthand aliases for readability in hand-crafted tile grids
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

// ═══ LOCATION UUIDs ═══
const LOC_TAVERN         = '00000000-0000-4000-a000-000000000001';
const LOC_DUNGEON        = '00000000-0000-4000-a000-000000000002';
const LOC_FOREST         = '00000000-0000-4000-a000-000000000003';
const LOC_STREET         = '00000000-0000-4000-a000-000000000004';
const LOC_CHURCH         = '00000000-0000-4000-a000-000000000005';
const LOC_WIZARD_SHOP    = '00000000-0000-4000-a000-000000000006';
const LOC_CASTLE_GATE    = '00000000-0000-4000-a000-000000000007';
const LOC_OUTSKIRTS      = '00000000-0000-4000-a000-000000000008';
const LOC_RIVER_CROSSING = '00000000-0000-4000-a000-000000000009';
const LOC_TAVERN_CELLAR  = '00000000-0000-4000-a000-000000000010';

// ═══════════════════════════════════════════════════════════════════════
// HAND-CRAFTED INDOOR LOCATIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * 1. Tavern "The Dying Ember" — 20×16 (hand-crafted)
 *    Exit: south → Castle Street
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
        { x: 9, y: 13, label: 'from_south' },
        { x: 10, y: 13, label: 'from_south' },
        { x: 16, y: 2, label: 'from_cellar' },
    ],
    exits: [
        { tile_x: 9, tile_y: 15, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_north', edge: 'south' },
        { tile_x: 10, tile_y: 15, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_north', edge: 'south' },
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
 * 1b. Tavern Cellar — quest-only combat room
 *    Exit: south -> The Dying Ember
 */
export const TAVERN_CELLAR: LocationMap = {
    id: LOC_TAVERN_CELLAR,
    name: 'Tavern Cellar',
    biome_type: 'Ruins',
    room_type: 'Arena',
    width: 20,
    height: 16,
    threat_level: 2,
    spawn_points: [
        { x: 10, y: 2, label: 'from_tavern' },
    ],
    exits: [
        { tile_x: 10, tile_y: 15, target_location_id: LOC_TAVERN, target_location_name: 'The Dying Ember', spawn_label: 'from_cellar', edge: 'south' },
    ],
    tiles: [
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
        [W, F, F, F, F, BR, F, F, F, F, F, F, F, BR, F, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, ST, ST, F, F, F, F, F, F, F, F, W],
        [W, F, BR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, BR, F, W],
        [W, F, F, F, F, CR, F, F, F, F, F, F, F, CR, F, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, C, F, F, C, F, F, F, F, F, F, F, W],
        [W, F, BR, F, F, F, F, F, F, RG, RG, F, F, F, F, F, F, BR, F, W],
        [W, F, F, F, F, F, F, F, RG, RG, RG, RG, F, F, F, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, RG, RG, RG, RG, F, F, F, F, F, F, F, W],
        [W, F, BR, F, F, F, F, F, F, RG, RG, F, F, F, F, F, F, BR, F, W],
        [W, F, F, F, F, F, F, F, C, F, F, C, F, F, F, F, F, F, F, W],
        [W, F, F, F, F, CR, F, F, F, F, F, F, F, CR, F, F, F, F, F, W],
        [W, F, BR, F, F, F, F, F, F, F, F, F, F, F, F, F, F, BR, F, W],
        [W, F, F, F, F, BR, F, F, F, F, F, F, F, BR, F, F, F, F, F, W],
        [W, W, W, W, W, W, W, W, W, W, D, W, W, W, W, W, W, W, W, W],
        [_, _, _, _, _, _, _, _, _, _, F, _, _, _, _, _, _, _, _, _],
    ],
};

/**
 * 2. Chapel of Ashes — 16×14 (hand-crafted)
 *    Exit: east → Castle Street
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
        { x: 13, y: 6, label: 'from_east' },
        { x: 13, y: 7, label: 'from_east' },
    ],
    exits: [
        { tile_x: 15, tile_y: 6, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_west', edge: 'east' },
        { tile_x: 15, tile_y: 7, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_west', edge: 'east' },
    ],
    tiles: [
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
        [W, F, F, F, F, F, C, F, F, C, F, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, C, F, F, F, F, FP, F, F, F, F, C, F, F, W],
        [W, F, F, F, CH, F, F, F, F, F, CH, F, F, F, F, W],
        [W, F, F, F, CH, F, F, RG, F, F, CH, F, F, F, F, W],
        [W, F, C, F, CH, F, F, RG, F, F, CH, F, C, F, D, D],
        [W, F, F, F, CH, F, F, F, F, F, CH, F, F, F, D, D],
        [W, F, F, F, CH, F, F, F, F, F, CH, F, F, F, F, W],
        [W, F, F, F, F, F, F, RG, F, F, F, F, F, F, F, W],
        [W, F, C, F, F, F, F, F, F, F, F, F, C, F, F, W],
        [W, F, F, F, F, BK, F, F, F, BK, F, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    ],
};

/**
 * 3. Arcane Emporium — 16×14 (hand-crafted)
 *    Exit: west → Castle Street
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
        { x: 2, y: 6, label: 'from_west' },
        { x: 2, y: 7, label: 'from_west' },
    ],
    exits: [
        { tile_x: 0, tile_y: 6, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_east', edge: 'west' },
        { tile_x: 0, tile_y: 7, target_location_id: LOC_STREET, target_location_name: 'Castle Street', spawn_label: 'from_east', edge: 'west' },
    ],
    tiles: [
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, F, BK, F, BK, F, F, F, BK, F, BK, F, F, F, W],
        [W, F, F, F, F, F, F, C, F, F, F, F, F, CS, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, BA, BA, BA, BA, F, F, F, F, CR, F, CR, F, F, W],
        [D, D, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [D, D, F, F, F, F, F, RG, F, F, F, F, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, F, F, BR, F, F, F, C, F, F, F, BR, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, CS, F, W],
        [W, F, F, BK, F, BK, F, F, F, BK, F, BK, F, F, F, W],
        [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
        [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    ],
};

// ═══════════════════════════════════════════════════════════════════════
// HAND-CRAFTED CASTLE STREET (complex hub with many connections)
// ═══════════════════════════════════════════════════════════════════════

/**
 * 4. Castle Street — 24×18 (hand-crafted organic hub)
 *    Exits: north → Tavern, west → Chapel, east → Wizard, south → Outskirts
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
        { x: 11, y: 3, label: 'from_north' },
        { x: 12, y: 3, label: 'from_north' },
        { x: 4, y: 8, label: 'from_west' },
        { x: 4, y: 9, label: 'from_west' },
        { x: 19, y: 8, label: 'from_east' },
        { x: 19, y: 9, label: 'from_east' },
        { x: 10, y: 16, label: 'from_south' },
        { x: 11, y: 16, label: 'from_south' },
        { x: 12, y: 16, label: 'from_south' },
        { x: 13, y: 16, label: 'from_south' },
    ],
    exits: [
        // North → Tavern
        { tile_x: 11, tile_y: 1, target_location_id: LOC_TAVERN, target_location_name: 'The Dying Ember', spawn_label: 'from_south', edge: 'north' },
        { tile_x: 12, tile_y: 1, target_location_id: LOC_TAVERN, target_location_name: 'The Dying Ember', spawn_label: 'from_south', edge: 'north' },
        // West → Chapel
        { tile_x: 2, tile_y: 8, target_location_id: LOC_CHURCH, target_location_name: 'Chapel of Ashes', spawn_label: 'from_east', edge: 'west' },
        { tile_x: 2, tile_y: 9, target_location_id: LOC_CHURCH, target_location_name: 'Chapel of Ashes', spawn_label: 'from_east', edge: 'west' },
        // East → Wizard Shop
        { tile_x: 21, tile_y: 8, target_location_id: LOC_WIZARD_SHOP, target_location_name: 'Arcane Emporium', spawn_label: 'from_west', edge: 'east' },
        { tile_x: 21, tile_y: 9, target_location_id: LOC_WIZARD_SHOP, target_location_name: 'Arcane Emporium', spawn_label: 'from_west', edge: 'east' },
        // South → Outskirts
        { tile_x: 10, tile_y: 17, target_location_id: LOC_OUTSKIRTS, target_location_name: 'Castle Outskirts', spawn_label: 'from_north', edge: 'south' },
        { tile_x: 11, tile_y: 17, target_location_id: LOC_OUTSKIRTS, target_location_name: 'Castle Outskirts', spawn_label: 'from_north', edge: 'south' },
        { tile_x: 12, tile_y: 17, target_location_id: LOC_OUTSKIRTS, target_location_name: 'Castle Outskirts', spawn_label: 'from_north', edge: 'south' },
        { tile_x: 13, tile_y: 17, target_location_id: LOC_OUTSKIRTS, target_location_name: 'Castle Outskirts', spawn_label: 'from_north', edge: 'south' },
    ],
    tiles: [
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, W, W, W, W, W, W, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, WA, WA, W, W, D, D, W, W, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, CB, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, WA, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, WA, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, WA, WA, CB, CB, CB, CF, CB, CB, CF, CB, CB, CB, CB, CB, WA, TR, TR, TR, TR, TR],
        [W, W, W, TR, TR, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, TR, TR, W, W, W],
        [W, W, D, W, TR, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, TR, W, D, W, W],
        [TR, TR, D, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, D, TR, TR],
        [TR, TR, D, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, D, TR, TR],
        [W, W, D, W, TR, TR, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, TR, TR, W, D, W, W],
        [W, W, W, TR, TR, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, TR, TR, W, W, W],
        [TR, TR, TR, TR, WA, WA, CB, CB, CB, CF, CB, CB, CF, CB, CB, CB, CB, CB, WA, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, WA, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, WA, WA, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, CB, CB, WA, WA, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, WA, WA, CB, CB, CB, CB, CB, CB, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, W, CB, CB, CB, CB, W, TR, TR, TR, TR, TR, TR, TR, TR, TR],
        [TR, TR, TR, TR, TR, TR, TR, TR, TR, W, D, D, D, D, W, TR, TR, TR, TR, TR, TR, TR, TR, TR],
    ],
};

// ═══════════════════════════════════════════════════════════════════════
// PROCEDURALLY GENERATED OUTDOOR & DUNGEON LOCATIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * 5. Castle Outskirts — oval outdoor area
 *    Exits: north → Castle Street, west → River Crossing, east → Hollow Crypts
 */
export const CASTLE_OUTSKIRTS: LocationMap = generateLocationMap({
    id: LOC_OUTSKIRTS,
    name: 'Castle Outskirts',
    biome: 'HubRegion',
    roomType: 'Corridor',
    threatLevel: 1,
    width: 24,
    height: 18,
    shape: 'oval',
    seed: 42001,
    exits: [
        {
            edge: 'north',
            width: 4,
            targetLocationId: LOC_STREET,
            targetLocationName: 'Castle Street',
            spawnLabel: 'from_north',
        },
        {
            edge: 'west',
            width: 2,
            targetLocationId: LOC_RIVER_CROSSING,
            targetLocationName: 'River Crossing',
            spawnLabel: 'from_west',
        },
        {
            edge: 'east',
            width: 2,
            targetLocationId: LOC_DUNGEON,
            targetLocationName: 'Hollow Crypts',
            spawnLabel: 'from_east',
        },
    ],
});

/**
 * 6. River Crossing — irregular shape with environmental challenge
 *    Exits: east → Castle Outskirts, west → Whisper Glade
 */
export const RIVER_CROSSING: LocationMap = generateLocationMap({
    id: LOC_RIVER_CROSSING,
    name: 'River Crossing',
    biome: 'HubRegion',
    roomType: 'Corridor',
    threatLevel: 2,
    width: 18,
    height: 16,
    shape: 'irregular',
    seed: 42002,
    exits: [
        {
            edge: 'east',
            width: 2,
            targetLocationId: LOC_OUTSKIRTS,
            targetLocationName: 'Castle Outskirts',
            spawnLabel: 'from_east',
        },
        {
            edge: 'west',
            width: 2,
            targetLocationId: LOC_FOREST,
            targetLocationName: 'Whisper Glade',
            spawnLabel: 'from_west',
        },
    ],
});

/**
 * 7. Whisper Glade — large oval forest
 *    Exits: east → River Crossing, south → (dead end/future expansion)
 */
export const FOREST_WHISPER_GLADE: LocationMap = generateLocationMap({
    id: LOC_FOREST,
    name: 'Whisper Glade',
    biome: 'DarkForest',
    roomType: 'SafeZone',
    threatLevel: 2,
    width: 28,
    height: 22,
    shape: 'oval',
    seed: 42003,
    exits: [
        {
            edge: 'east',
            width: 2,
            targetLocationId: LOC_RIVER_CROSSING,
            targetLocationName: 'River Crossing',
            spawnLabel: 'from_east',
        },
    ],
    incomingSpawns: [
        { edge: 'west', width: 2, spawnLabel: 'from_west' },
    ],
});

/**
 * 8. Castle Gate — corridor between street and dungeon
 *    Exits: north → Castle Street, south → Hollow Crypts
 */
export const CASTLE_GATE: LocationMap = generateLocationMap({
    id: LOC_CASTLE_GATE,
    name: 'Castle Gate',
    biome: 'Ruins',
    roomType: 'Corridor',
    threatLevel: 1,
    width: 20,
    height: 14,
    shape: 'rectangle',
    seed: 42004,
    exits: [
        {
            edge: 'north',
            width: 2,
            targetLocationId: LOC_STREET,
            targetLocationName: 'Castle Street',
            spawnLabel: 'from_north',
        },
        {
            edge: 'south',
            width: 2,
            targetLocationId: LOC_DUNGEON,
            targetLocationName: 'Hollow Crypts',
            spawnLabel: 'from_south',
        },
    ],
});

/**
 * 9. Hollow Crypts — cave-shaped dungeon
 *    Exits: west → Castle Outskirts, north → Castle Gate
 */
export const DUNGEON_HOLLOW_CRYPTS: LocationMap = generateLocationMap({
    id: LOC_DUNGEON,
    name: 'Hollow Crypts',
    biome: 'CrystalCaves',
    roomType: 'Arena',
    threatLevel: 5,
    width: 24,
    height: 20,
    shape: 'cave',
    seed: 42005,
    exits: [
        {
            edge: 'west',
            width: 2,
            targetLocationId: LOC_OUTSKIRTS,
            targetLocationName: 'Castle Outskirts',
            spawnLabel: 'from_west',
        },
        {
            edge: 'north',
            width: 2,
            targetLocationId: LOC_CASTLE_GATE,
            targetLocationName: 'Castle Gate',
            spawnLabel: 'from_north',
        },
    ],
    incomingSpawns: [
        { edge: 'south', width: 2, spawnLabel: 'from_south' },
        { edge: 'east', width: 2, spawnLabel: 'from_east' },
    ],
});

export const ALL_SEED_LOCATIONS: LocationMap[] = [
    TAVERN_DYING_EMBER,
    TAVERN_CELLAR,
    CASTLE_STREET,
    CHAPEL_OF_ASHES,
    ARCANE_EMPORIUM,
    CASTLE_GATE,
    DUNGEON_HOLLOW_CRYPTS,
    FOREST_WHISPER_GLADE,
    CASTLE_OUTSKIRTS,
    RIVER_CROSSING,
];
