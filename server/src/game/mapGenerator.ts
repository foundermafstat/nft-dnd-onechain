import { TileType, LocationMap, ExitEdge, SpawnPoint, LocationExit } from 'shared';

// ── Types ──────────────────────────────────────────────────────────────

export interface ExitSpec {
    edge: ExitEdge;
    position?: number;   // tile index along edge (auto-centered if omitted)
    width?: number;      // exit width in tiles (default 2)
    targetLocationId: string;
    targetLocationName: string;
    spawnLabel: string;  // spawn_label placed inside THIS map for incoming players
}

/** Spawn-only entry point: creates spawn points but no exit tiles */
export interface IncomingSpawn {
    edge: ExitEdge;
    position?: number;
    width?: number;
    spawnLabel: string;
}

export interface MapGenConfig {
    id: string;
    name: string;
    biome: string;
    roomType: string;
    threatLevel: number;
    width: number;
    height: number;
    shape: 'oval' | 'cave' | 'irregular' | 'lshape' | 'rectangle';
    exits: ExitSpec[];
    incomingSpawns?: IncomingSpawn[];  // spawn-only entry points (no exit tiles)
    seed?: number;       // optional PRNG seed for reproducibility
}

// ── Biome decoration rules ─────────────────────────────────────────────

interface BiomeRules {
    borderTile: TileType;
    fillTile: TileType;
    features: TileType[];
    featureDensity: number;   // 0..1
}

const BIOME_RULES: Record<string, BiomeRules> = {
    DarkForest: {
        borderTile: TileType.Tree,
        fillTile: TileType.Floor,
        features: [TileType.Campfire, TileType.Crate, TileType.Column],
        featureDensity: 0.02,
    },
    HubRegion: {
        borderTile: TileType.Tree,
        fillTile: TileType.Cobblestone,
        features: [TileType.Campfire, TileType.Barrel, TileType.Crate],
        featureDensity: 0.03,
    },
    CrystalCaves: {
        borderTile: TileType.Wall,
        fillTile: TileType.Floor,
        features: [TileType.Column, TileType.Chest, TileType.Crate],
        featureDensity: 0.04,
    },
    Swamp: {
        borderTile: TileType.Water,
        fillTile: TileType.Floor,
        features: [TileType.Campfire, TileType.Tree],
        featureDensity: 0.015,
    },
    Ruins: {
        borderTile: TileType.Wall,
        fillTile: TileType.Cobblestone,
        features: [TileType.Column, TileType.Chest, TileType.Bookshelf],
        featureDensity: 0.035,
    },
};

// ── Simple seeded PRNG ─────────────────────────────────────────────────

function mulberry32(seed: number) {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── Shape masks ────────────────────────────────────────────────────────
// Returns boolean[][] — true = inside the shape (walkable area)

function ovalMask(w: number, h: number, rng: () => number): boolean[][] {
    const cx = w / 2, cy = h / 2;
    const rx = w / 2 - 1, ry = h / 2 - 1;
    const mask: boolean[][] = [];
    for (let y = 0; y < h; y++) {
        mask[y] = [];
        for (let x = 0; x < w; x++) {
            const dx = (x - cx) / rx;
            const dy = (y - cy) / ry;
            // Add noise to the edge for organic feel
            const noise = (rng() - 0.5) * 0.3;
            mask[y][x] = dx * dx + dy * dy < (1.0 + noise);
        }
    }
    return mask;
}

function caveMask(w: number, h: number, rng: () => number): boolean[][] {
    // Cellular automata approach
    let grid: boolean[][] = [];
    const FILL = 0.48;
    // Initialize randomly
    for (let y = 0; y < h; y++) {
        grid[y] = [];
        for (let x = 0; x < w; x++) {
            if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
                grid[y][x] = false;
            } else {
                grid[y][x] = rng() > FILL;
            }
        }
    }
    // Run automata passes
    for (let iter = 0; iter < 5; iter++) {
        const next: boolean[][] = [];
        for (let y = 0; y < h; y++) {
            next[y] = [];
            for (let x = 0; x < w; x++) {
                if (y === 0 || y === h - 1 || x === 0 || x === w - 1) {
                    next[y][x] = false;
                    continue;
                }
                let neighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dy === 0 && dx === 0) continue;
                        if (grid[y + dy]?.[x + dx]) neighbors++;
                    }
                }
                next[y][x] = neighbors >= 5 || (grid[y][x] && neighbors >= 4);
            }
        }
        grid = next;
    }
    return grid;
}

function irregularMask(w: number, h: number, rng: () => number): boolean[][] {
    // Start with oval, then apply blob distortion
    const base = ovalMask(w, h, rng);
    // Smooth with CA pass
    for (let iter = 0; iter < 2; iter++) {
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let n = 0;
                for (let dy = -1; dy <= 1; dy++)
                    for (let dx = -1; dx <= 1; dx++)
                        if (base[y + dy]?.[x + dx]) n++;
                base[y][x] = n >= 5;
            }
        }
    }
    return base;
}

function lShapeMask(w: number, h: number, rng: () => number): boolean[][] {
    const mask: boolean[][] = [];
    const splitX = Math.floor(w * (0.4 + rng() * 0.2));
    const splitY = Math.floor(h * (0.4 + rng() * 0.2));

    for (let y = 0; y < h; y++) {
        mask[y] = [];
        for (let x = 0; x < w; x++) {
            // L-shape: bottom-left + right-bottom
            const inHorizontal = y >= splitY && x >= 1 && x < w - 1;
            const inVertical = x < splitX && y >= 1 && y < h - 1;
            mask[y][x] = inHorizontal || inVertical;
        }
    }
    return mask;
}

function rectangleMask(w: number, h: number): boolean[][] {
    const mask: boolean[][] = [];
    for (let y = 0; y < h; y++) {
        mask[y] = [];
        for (let x = 0; x < w; x++) {
            mask[y][x] = y > 0 && y < h - 1 && x > 0 && x < w - 1;
        }
    }
    return mask;
}

function getShapeMask(shape: MapGenConfig['shape'], w: number, h: number, rng: () => number): boolean[][] {
    switch (shape) {
        case 'oval': return ovalMask(w, h, rng);
        case 'cave': return caveMask(w, h, rng);
        case 'irregular': return irregularMask(w, h, rng);
        case 'lshape': return lShapeMask(w, h, rng);
        case 'rectangle': return rectangleMask(w, h);
    }
}

// ── Exit position resolver ─────────────────────────────────────────────

interface ResolvedExit {
    exitTiles: { x: number; y: number }[];
    spawnTiles: { x: number; y: number }[];
    spec: ExitSpec;
}

function resolveExitPositions(edge: ExitEdge, w: number, h: number, position?: number, exitWidth: number = 2): { exitTiles: { x: number; y: number }[]; spawnTiles: { x: number; y: number }[] } {
    const exits: { x: number; y: number }[] = [];
    const spawns: { x: number; y: number }[] = [];

    switch (edge) {
        case 'north': {
            const cx = position ?? Math.floor(w / 2);
            for (let i = 0; i < exitWidth; i++) {
                exits.push({ x: cx - Math.floor(exitWidth / 2) + i, y: 0 });
                spawns.push({ x: cx - Math.floor(exitWidth / 2) + i, y: 2 });
            }
            break;
        }
        case 'south': {
            const cx = position ?? Math.floor(w / 2);
            for (let i = 0; i < exitWidth; i++) {
                exits.push({ x: cx - Math.floor(exitWidth / 2) + i, y: h - 1 });
                spawns.push({ x: cx - Math.floor(exitWidth / 2) + i, y: h - 3 });
            }
            break;
        }
        case 'west': {
            const cy = position ?? Math.floor(h / 2);
            for (let i = 0; i < exitWidth; i++) {
                exits.push({ x: 0, y: cy - Math.floor(exitWidth / 2) + i });
                spawns.push({ x: 2, y: cy - Math.floor(exitWidth / 2) + i });
            }
            break;
        }
        case 'east': {
            const cy = position ?? Math.floor(h / 2);
            for (let i = 0; i < exitWidth; i++) {
                exits.push({ x: w - 1, y: cy - Math.floor(exitWidth / 2) + i });
                spawns.push({ x: w - 3, y: cy - Math.floor(exitWidth / 2) + i });
            }
            break;
        }
        case 'nw': {
            exits.push({ x: 0, y: 0 }, { x: 1, y: 0 });
            spawns.push({ x: 2, y: 2 }, { x: 3, y: 2 });
            break;
        }
        case 'ne': {
            exits.push({ x: w - 1, y: 0 }, { x: w - 2, y: 0 });
            spawns.push({ x: w - 3, y: 2 }, { x: w - 4, y: 2 });
            break;
        }
        case 'sw': {
            exits.push({ x: 0, y: h - 1 }, { x: 1, y: h - 1 });
            spawns.push({ x: 2, y: h - 3 }, { x: 3, y: h - 3 });
            break;
        }
        case 'se': {
            exits.push({ x: w - 1, y: h - 1 }, { x: w - 2, y: h - 1 });
            spawns.push({ x: w - 3, y: h - 3 }, { x: w - 4, y: h - 3 });
            break;
        }
        case 'center': {
            const cx = Math.floor(w / 2);
            const cy = Math.floor(h / 2);
            exits.push({ x: cx, y: cy });
            spawns.push({ x: cx, y: cy });
            break;
        }
    }

    return { exitTiles: exits, spawnTiles: spawns };
}

// ── Corridor carving (from exit inward) ────────────────────────────────

function carveCorridors(mask: boolean[][], resolved: ResolvedExit[], w: number, h: number) {
    for (const r of resolved) {
        const allTiles = [...r.exitTiles, ...r.spawnTiles];
        for (const t of allTiles) {
            if (t.y >= 0 && t.y < h && t.x >= 0 && t.x < w) {
                mask[t.y][t.x] = true;
            }
        }
        // Carve path between exit and spawn
        for (let i = 0; i < r.exitTiles.length; i++) {
            const from = r.exitTiles[i];
            const to = r.spawnTiles[i] ?? r.spawnTiles[0];
            carveLine(mask, from.x, from.y, to.x, to.y, w, h);
        }
        // Carve a 3-tile wide pad around spawn for player movement
        for (const sp of r.spawnTiles) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const ny = sp.y + dy, nx = sp.x + dx;
                    if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                        mask[ny][nx] = true;
                    }
                }
            }
        }
    }
}

function carveLine(mask: boolean[][], x0: number, y0: number, x1: number, y1: number, w: number, h: number) {
    // Bresenham with width
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0, y = y0;
    while (true) {
        // Carve 2-wide corridor
        for (let d = -1; d <= 1; d++) {
            if (dx > dy) {
                if (y + d >= 0 && y + d < h) mask[y + d][x] = true;
            } else {
                if (x + d >= 0 && x + d < w) mask[y][x + d] = true;
            }
        }
        if (x === x1 && y === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

// ── Flood-fill connectivity check ──────────────────────────────────────

function isFullyConnected(mask: boolean[][], w: number, h: number): boolean {
    // Find first walkable tile
    let startX = -1, startY = -1;
    outer:
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (mask[y][x]) { startX = x; startY = y; break outer; }
        }
    }
    if (startX < 0) return false;

    const visited = new Set<string>();
    const stack = [{ x: startX, y: startY }];
    while (stack.length) {
        const { x, y } = stack.pop()!;
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        if (x < 0 || x >= w || y < 0 || y >= h || !mask[y][x]) continue;
        visited.add(key);
        stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
    }

    let total = 0;
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
            if (mask[y][x]) total++;

    return visited.size === total;
}

// ── Main generator ─────────────────────────────────────────────────────

export function generateLocationMap(config: MapGenConfig): LocationMap {
    const { id, name, biome, roomType, threatLevel, width: w, height: h, shape, exits: exitSpecs } = config;
    const rng = mulberry32(config.seed ?? (id.charCodeAt(0) * 73856093 + id.charCodeAt(1) * 19349663));

    // 1. Get biome rules
    const rules = BIOME_RULES[biome] || BIOME_RULES.HubRegion;

    // 2. Generate shape mask
    let mask = getShapeMask(shape, w, h, rng);

    // 3. Resolve exits and carve corridors
    const resolved: ResolvedExit[] = exitSpecs.map(spec => {
        const { exitTiles, spawnTiles } = resolveExitPositions(spec.edge, w, h, spec.position, spec.width ?? 2);
        return { exitTiles, spawnTiles, spec };
    });

    // 3b. Resolve incoming-only spawns (no exit tiles, just spawn points)
    const incomingResolved: ResolvedExit[] = (config.incomingSpawns ?? []).map(inc => {
        const { spawnTiles } = resolveExitPositions(inc.edge, w, h, inc.position, inc.width ?? 2);
        return {
            exitTiles: [],  // no exit tiles for incoming-only spawns
            spawnTiles,
            spec: { ...inc, targetLocationId: '', targetLocationName: '' } as ExitSpec,
        };
    });
    const allResolved = [...resolved, ...incomingResolved];
    carveCorridors(mask, allResolved, w, h);

    // 4. Ensure connectivity — if not, retry with more open shape
    if (!isFullyConnected(mask, w, h)) {
        // Fallback: force oval with extra erosion
        mask = ovalMask(w, h, rng);
        carveCorridors(mask, allResolved, w, h);
    }

    // 5. Build tile grid
    const tiles: TileType[][] = [];
    for (let y = 0; y < h; y++) {
        tiles[y] = [];
        for (let x = 0; x < w; x++) {
            if (!mask[y][x]) {
                // Check if adjacent to walkable — border tile
                let adjacentWalkable = false;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (mask[y + dy]?.[x + dx]) { adjacentWalkable = true; break; }
                    }
                    if (adjacentWalkable) break;
                }
                tiles[y][x] = adjacentWalkable ? rules.borderTile : TileType.Void;
            } else {
                tiles[y][x] = rules.fillTile;
            }
        }
    }

    // 6. Place exit tiles as Door
    for (const r of resolved) {
        for (const t of r.exitTiles) {
            if (t.y >= 0 && t.y < h && t.x >= 0 && t.x < w) {
                tiles[t.y][t.x] = TileType.Door;
            }
        }
    }

    // 7. Place random features
    for (let y = 2; y < h - 2; y++) {
        for (let x = 2; x < w - 2; x++) {
            if (tiles[y][x] === rules.fillTile && rng() < rules.featureDensity) {
                // Don't place features on spawn/exit tiles
                const isReserved = resolved.some(r =>
                    r.exitTiles.some(t => t.x === x && t.y === y) ||
                    r.spawnTiles.some(t => t.x === x && t.y === y) ||
                    r.spawnTiles.some(t => Math.abs(t.x - x) <= 1 && Math.abs(t.y - y) <= 1)
                );
                if (!isReserved) {
                    const feat = rules.features[Math.floor(rng() * rules.features.length)];
                    tiles[y][x] = feat;
                }
            }
        }
    }

    // 8. Build spawn_points and exits arrays
    const spawnPoints: SpawnPoint[] = [];
    const locationExits: LocationExit[] = [];

    for (const r of allResolved) {
        // Add spawn points (where incoming player lands)
        for (const sp of r.spawnTiles) {
            spawnPoints.push({ x: sp.x, y: sp.y, label: r.spec.spawnLabel });
        }
        // Add exit tiles (with target info) — only for real exits, not incoming-only spawns
        if (r.spec.targetLocationId) {
            for (const et of r.exitTiles) {
                locationExits.push({
                    tile_x: et.x,
                    tile_y: et.y,
                    target_location_id: r.spec.targetLocationId,
                    target_location_name: r.spec.targetLocationName,
                    spawn_label: r.spec.spawnLabel,
                    edge: r.spec.edge,
                });
            }
        }
    }

    return {
        id,
        name,
        biome_type: biome,
        room_type: roomType,
        width: w,
        height: h,
        tiles,
        spawn_points: spawnPoints,
        exits: locationExits,
        threat_level: threatLevel,
    };
}

/**
 * Helper: given an exit edge on Map A, return the corresponding spawn edge on Map B.
 * E.g. if you exit "east" from A, you enter B from "west".
 */
export function oppositeEdge(edge: ExitEdge): ExitEdge {
    const map: Record<ExitEdge, ExitEdge> = {
        north: 'south',
        south: 'north',
        east: 'west',
        west: 'east',
        nw: 'se',
        ne: 'sw',
        sw: 'ne',
        se: 'nw',
        center: 'center',
    };
    return map[edge];
}
