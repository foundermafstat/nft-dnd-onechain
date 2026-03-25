/**
 * A* Pathfinding for tile-based grid.
 * Finds shortest path avoiding walls, NPCs, and unwalkable tiles.
 */

import { LocationMap } from 'shared';
import { isTileWalkable } from './tileRenderer';

export interface PathNode {
    x: number;
    y: number;
}

interface AStarNode {
    x: number;
    y: number;
    g: number;  // Cost from start
    h: number;  // Heuristic to end
    f: number;  // g + h
    parent: AStarNode | null;
}

/**
 * Find shortest path from (sx,sy) to (ex,ey) on the location grid.
 * Returns array of PathNode from start (exclusive) to end (inclusive),
 * or empty array if no path exists.
 *
 * @param blockedTiles — additional tiles to treat as unwalkable (e.g. NPC positions)
 */
export function findPath(
    map: LocationMap,
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    blockedTiles?: Set<string>,
): PathNode[] {
    // Quick bounds check
    if (ex < 0 || ey < 0 || ex >= map.width || ey >= map.height) return [];
    if (sx === ex && sy === ey) return [];

    // Target must be walkable (unless it's an exit tile)
    const isExitTile = map.exits?.some(e => e.tile_x === ex && e.tile_y === ey);
    if (!isExitTile && !isTileWalkable(map, ex, ey)) return [];

    const key = (x: number, y: number) => `${x},${y}`;

    const open: AStarNode[] = [];
    const closed = new Set<string>();

    // Manhattan distance heuristic
    const heuristic = (x: number, y: number) => Math.abs(x - ex) + Math.abs(y - ey);

    const startNode: AStarNode = { x: sx, y: sy, g: 0, h: heuristic(sx, sy), f: heuristic(sx, sy), parent: null };
    open.push(startNode);

    // 4-directional movement (no diagonals for cleaner grid movement)
    const dirs = [
        { dx: 0, dy: -1 }, // up
        { dx: 1, dy: 0 },  // right
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }, // left
    ];

    let iterations = 0;
    const maxIterations = map.width * map.height * 2; // Safety limit

    while (open.length > 0 && iterations < maxIterations) {
        iterations++;

        // Find node with lowest f in open list
        let bestIdx = 0;
        for (let i = 1; i < open.length; i++) {
            if (open[i].f < open[bestIdx].f || (open[i].f === open[bestIdx].f && open[i].h < open[bestIdx].h)) {
                bestIdx = i;
            }
        }
        const current = open.splice(bestIdx, 1)[0];
        const currentKey = key(current.x, current.y);

        if (current.x === ex && current.y === ey) {
            // Reconstruct path (excluding the start position)
            const path: PathNode[] = [];
            let node: AStarNode | null = current;
            while (node && !(node.x === sx && node.y === sy)) {
                path.push({ x: node.x, y: node.y });
                node = node.parent;
            }
            return path.reverse();
        }

        closed.add(currentKey);

        for (const dir of dirs) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;
            const nk = key(nx, ny);

            if (closed.has(nk)) continue;
            if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;

            // Check if destination tile OR it's the target exit
            const isTarget = nx === ex && ny === ey;
            const isTargetExit = isTarget && isExitTile;

            if (!isTargetExit && !isTileWalkable(map, nx, ny)) continue;
            if (blockedTiles && blockedTiles.has(nk) && !isTarget) continue;

            const g = current.g + 1;
            const h = heuristic(nx, ny);
            const f = g + h;

            // Check if already in open with better g
            const existingIdx = open.findIndex(n => n.x === nx && n.y === ny);
            if (existingIdx !== -1) {
                if (g < open[existingIdx].g) {
                    open[existingIdx].g = g;
                    open[existingIdx].f = f;
                    open[existingIdx].parent = current;
                }
                continue;
            }

            open.push({ x: nx, y: ny, g, h, f, parent: current });
        }
    }

    return []; // No path found
}
