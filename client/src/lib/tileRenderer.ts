import { TileType, LocationMap, WALKABLE_TILES } from 'shared';

// ── Dark fantasy color palette per tile type ────────────────────────────
const TILE_COLORS: Record<TileType, string> = {
    [TileType.Void]: '#050403',
    [TileType.Floor]: '#1c1814',
    [TileType.Wall]: '#3a332a',
    [TileType.Door]: '#6b5c3e',
    [TileType.Column]: '#4a4035',
    [TileType.Table]: '#5c4a30',
    [TileType.Chair]: '#4a3d28',
    [TileType.Barrel]: '#5a4428',
    [TileType.Chest]: '#8b6914',
    [TileType.Staircase]: '#6e6050',
    [TileType.Fireplace]: '#8b3a0f',
    [TileType.Bar]: '#5c4a30',
    [TileType.Bed]: '#4a3020',
    [TileType.Bookshelf]: '#3a2a1a',
    [TileType.Crate]: '#5a4428',
    [TileType.Campfire]: '#a04010',
    [TileType.Tree]: '#1a2a10',
    [TileType.Water]: '#0a1830',
    [TileType.Rug]: '#3a1a1a',
    [TileType.Cobblestone]: '#2a2622',
    [TileType.Bridge]: '#4a3020',
};

const TILE_BORDER_COLORS: Partial<Record<TileType, string>> = {
    [TileType.Wall]: '#4a4238',
    [TileType.Door]: '#8b7a50',
    [TileType.Column]: '#5a5248',
    [TileType.Table]: '#6a5a40',
    [TileType.Chest]: '#c4960f',
    [TileType.Fireplace]: '#d45a1a',
    [TileType.Tree]: '#2a3a18',
    [TileType.Campfire]: '#d06020',
    [TileType.Water]: '#1a2840',
    [TileType.Cobblestone]: '#3a3430',
    [TileType.Bridge]: '#5a4030',
};

// ── Glow effects ────────────────────────────────────────────────────────
const GLOW_TILES: Partial<Record<TileType, { color: string; radius: number }>> = {
    [TileType.Fireplace]: { color: 'rgba(200, 80, 20, 0.15)', radius: 3 },
    [TileType.Campfire]: { color: 'rgba(200, 100, 30, 0.12)', radius: 4 },
    [TileType.Chest]: { color: 'rgba(200, 160, 30, 0.08)', radius: 1.5 },
};

/**
 * Renders the entire location tile grid onto a canvas 2D context.
 */
export function renderLocation(
    ctx: CanvasRenderingContext2D,
    map: LocationMap,
    cameraX: number,
    cameraY: number,
    tileSize: number,
    canvasWidth: number,
    canvasHeight: number,
) {
    // Background
    ctx.fillStyle = '#050403';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate visible tile range
    const startCol = Math.max(0, Math.floor(cameraX / tileSize));
    const startRow = Math.max(0, Math.floor(cameraY / tileSize));
    const endCol = Math.min(map.width, Math.ceil((cameraX + canvasWidth) / tileSize));
    const endRow = Math.min(map.height, Math.ceil((cameraY + canvasHeight) / tileSize));

    // Pass 1: Draw base tiles
    for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
            const tile = map.tiles[row]?.[col] ?? TileType.Void;
            const px = col * tileSize - cameraX;
            const py = row * tileSize - cameraY;

            // Base color
            ctx.fillStyle = TILE_COLORS[tile] || TILE_COLORS[TileType.Void];
            ctx.fillRect(px, py, tileSize, tileSize);

            // Border for structural tiles
            const border = TILE_BORDER_COLORS[tile];
            if (border) {
                ctx.strokeStyle = border;
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
            }

            // Tile-specific decorations
            drawTileDecoration(ctx, tile, px, py, tileSize);
        }
    }

    // Pass 2: Glow effects (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (let row = startRow; row < endRow; row++) {
        for (let col = startCol; col < endCol; col++) {
            const tile = map.tiles[row]?.[col] ?? TileType.Void;
            const glow = GLOW_TILES[tile];
            if (glow) {
                const px = col * tileSize - cameraX + tileSize / 2;
                const py = row * tileSize - cameraY + tileSize / 2;
                const r = glow.radius * tileSize;
                const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
                grad.addColorStop(0, glow.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(px - r, py - r, r * 2, r * 2);
            }
        }
    }
    ctx.globalCompositeOperation = 'source-over';

    // Pass 3: Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    for (let col = startCol; col <= endCol; col++) {
        const x = col * tileSize - cameraX;
        ctx.beginPath();
        ctx.moveTo(x, startRow * tileSize - cameraY);
        ctx.lineTo(x, endRow * tileSize - cameraY);
        ctx.stroke();
    }
    for (let row = startRow; row <= endRow; row++) {
        const y = row * tileSize - cameraY;
        ctx.beginPath();
        ctx.moveTo(startCol * tileSize - cameraX, y);
        ctx.lineTo(endCol * tileSize - cameraX, y);
        ctx.stroke();
    }
}

/**
 * Draws schematic decoration on top of the base tile color.
 */
function drawTileDecoration(ctx: CanvasRenderingContext2D, tile: TileType, px: number, py: number, s: number) {
    const cx = px + s / 2;
    const cy = py + s / 2;
    const inset = s * 0.2;

    switch (tile) {
        case TileType.Column:
            // Circle
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = '#5a5248';
            ctx.fill();
            ctx.strokeStyle = '#6a6258';
            ctx.lineWidth = 1;
            ctx.stroke();
            break;

        case TileType.Table:
            // Rounded rectangle
            ctx.fillStyle = '#6a5a40';
            ctx.fillRect(px + inset, py + inset, s - inset * 2, s - inset * 2);
            break;

        case TileType.Chair:
            // Small square
            ctx.fillStyle = '#5a4d38';
            ctx.fillRect(px + s * 0.3, py + s * 0.3, s * 0.4, s * 0.4);
            break;

        case TileType.Barrel:
            // Filled circle
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#6a5438';
            ctx.fill();
            // Horizontal band
            ctx.strokeStyle = '#7a6448';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px + inset, cy);
            ctx.lineTo(px + s - inset, cy);
            ctx.stroke();
            break;

        case TileType.Chest:
            // Rectangle with keyhole
            ctx.fillStyle = '#a07a14';
            ctx.fillRect(px + inset, py + inset * 1.2, s - inset * 2, s - inset * 2.4);
            ctx.fillStyle = '#1c1814';
            ctx.fillRect(cx - 2, cy - 1, 4, 5);
            break;

        case TileType.Door:
            // Amber slit
            ctx.fillStyle = '#8b7a50';
            ctx.fillRect(px + s * 0.1, py + s * 0.4, s * 0.8, s * 0.2);
            break;

        case TileType.Fireplace:
            // Flame icon
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = '#d45a1a';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy - s * 0.08, s * 0.12, 0, Math.PI * 2);
            ctx.fillStyle = '#f0a030';
            ctx.fill();
            break;

        case TileType.Campfire:
            // Larger flame
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = '#c05818';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy - s * 0.05, s * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = '#f0a030';
            ctx.fill();
            break;

        case TileType.Bar:
            // Thick horizontal bar
            ctx.fillStyle = '#6a5a40';
            ctx.fillRect(px + 1, py + s * 0.35, s - 2, s * 0.3);
            ctx.strokeStyle = '#7a6a50';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 1, py + s * 0.35, s - 2, s * 0.3);
            break;

        case TileType.Bed:
            // Pillow + blanket
            ctx.fillStyle = '#5a3828';
            ctx.fillRect(px + inset, py + inset, s - inset * 2, s - inset * 2);
            ctx.fillStyle = '#6a4838';
            ctx.fillRect(px + inset, py + inset, s - inset * 2, s * 0.25);
            break;

        case TileType.Bookshelf:
            // Horizontal lines (books)
            ctx.fillStyle = '#4a3a2a';
            ctx.fillRect(px + inset * 0.5, py + inset * 0.5, s - inset, s - inset);
            ctx.strokeStyle = '#5a4a3a';
            ctx.lineWidth = 1;
            for (let i = 1; i <= 3; i++) {
                const ly = py + (s * i) / 4;
                ctx.beginPath();
                ctx.moveTo(px + inset, ly);
                ctx.lineTo(px + s - inset, ly);
                ctx.stroke();
            }
            break;

        case TileType.Bridge:
            // Draw horizontal wooden planks
            ctx.fillStyle = '#3a2010'; // Gaps between planks
            ctx.fillRect(px, py, s, s);
            ctx.fillStyle = '#6a4020'; // Plank color
            ctx.fillRect(px, py + s * 0.1, s, s * 0.2);
            ctx.fillRect(px, py + s * 0.4, s, s * 0.2);
            ctx.fillRect(px, py + s * 0.7, s, s * 0.2);
            break;

        case TileType.Crate:
            // X on box
            ctx.fillStyle = '#6a5438';
            ctx.fillRect(px + inset, py + inset, s - inset * 2, s - inset * 2);
            ctx.strokeStyle = '#7a6448';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + inset, py + inset);
            ctx.lineTo(px + s - inset, py + s - inset);
            ctx.moveTo(px + s - inset, py + inset);
            ctx.lineTo(px + inset, py + s - inset);
            ctx.stroke();
            break;

        case TileType.Staircase:
            // Horizontal stripes (steps)
            for (let i = 0; i < 4; i++) {
                const shade = 0.4 + i * 0.1;
                ctx.fillStyle = `rgba(110, 96, 80, ${shade})`;
                ctx.fillRect(px + 2, py + (s * i) / 4 + 1, s - 4, s / 4 - 2);
            }
            break;

        case TileType.Tree:
            // Dark circle
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2);
            ctx.fillStyle = '#1a3010';
            ctx.fill();
            // Trunk dot
            ctx.beginPath();
            ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2);
            ctx.fillStyle = '#3a2a10';
            ctx.fill();
            break;

        case TileType.Rug:
            // Slight border decoration
            ctx.strokeStyle = '#5a2a2a';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 3, py + 3, s - 6, s - 6);
            break;

        case TileType.Water:
            // Wavy line
            ctx.strokeStyle = '#1a3050';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + inset, cy);
            ctx.quadraticCurveTo(cx, cy - s * 0.15, px + s - inset, cy);
            ctx.stroke();
            break;
    }
}

/**
 * Renders a player token at tile coordinates.
 */
export function renderPlayer(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    color: string,
    tileSize: number,
    cameraX: number,
    cameraY: number,
    isLocalPlayer: boolean = false,
    name?: string,
) {
    const px = tileX * tileSize - cameraX + tileSize / 2;
    const py = tileY * tileSize - cameraY + tileSize / 2;
    const radius = tileSize * 0.35;

    // Outer glow for local player
    if (isLocalPlayer) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(px, py, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    // Player circle
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Inner highlight
    ctx.beginPath();
    ctx.arc(px - radius * 0.2, py - radius * 0.2, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();

    // Draw Name Label
    if (name) {
        ctx.font = 'bold 10px cinzel, serif';
        const labelW = ctx.measureText(name).width;
        ctx.fillStyle = 'rgba(5, 4, 3, 0.8)';
        ctx.fillRect(px - labelW / 2 - 4, py - radius - 20, labelW + 8, 16);
        ctx.fillStyle = isLocalPlayer ? '#fcd34d' : '#a8a29e'; // amber-300 or stone-400
        ctx.textAlign = 'center';
        ctx.fillText(name, px, py - radius - 9);
        ctx.textAlign = 'start';
    }
}

/**
 * Check if a tile coordinate is walkable.
 */
export function isTileWalkable(map: LocationMap, tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) return false;
    const tile = map.tiles[tileY]?.[tileX];
    return tile !== undefined && WALKABLE_TILES.has(tile);
}

/**
 * Renders a dark "Fog of War" overlay that reveals a smooth circle around the player.
 */
export function renderFogOfWar(
    ctx: CanvasRenderingContext2D,
    heroTileX: number,
    heroTileY: number,
    tileSize: number,
    cameraX: number,
    cameraY: number,
    canvasWidth: number,
    canvasHeight: number,
    visionRadius: number = 5.5
) {
    const px = heroTileX * tileSize - cameraX + tileSize / 2;
    const py = heroTileY * tileSize - cameraY + tileSize / 2;
    const r = visionRadius * tileSize;

    ctx.save();

    // Create a radial gradient that is completely transparent at the player,
    // fading out smoothly to an opaque deep dark fantasy shadow.
    const grad = ctx.createRadialGradient(px, py, r * 0.4, px, py, r);
    grad.addColorStop(0, 'rgba(3, 2, 2, 0)'); // Inner circle: fully transparent
    grad.addColorStop(1, 'rgba(3, 2, 2, 0.96)'); // Outer circle: opaque fog

    // Fill the entire screen. In Canvas, the final color stop (1) spans infinitely outward.
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.restore();
}
