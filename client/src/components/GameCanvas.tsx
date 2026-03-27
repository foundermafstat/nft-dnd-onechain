'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { renderLocation, renderPlayer, renderFogOfWar, isTileWalkable } from '@/lib/tileRenderer';
import { findPath, PathNode } from '@/lib/pathfinding';
import { LocationMap, LocationExit, TileType, CombatState } from 'shared';
import Tooltip from './Tooltip';
import CombatOverlay from './CombatOverlay';
import { useGameState } from '@/store/useGameState';
import { startAldricCellarCombat, submitAldricCombatResult } from '@/lib/martaQuestApi';

interface PlayerNode {
    id: string;
    tileX: number;
    tileY: number;
    color: string;
}

interface NpcNode {
    id: string;
    name: string;
    title?: string;
    tile_x: number;
    tile_y: number;
    sprite_color: string;
}

interface HoveredEntity {
    type: 'player' | 'npc';
    name: string;
    title?: string;
    screenX: number;
    screenY: number;
}

interface GameCanvasProps {
    playerId: string;
}

import { SERVER_URL } from '@/lib/config';

const TILE_SIZE = 36;
const DEFAULT_LOCATION_ID = '00000000-0000-4000-a000-000000000001';
const TAVERN_LOCATION_ID = '00000000-0000-4000-a000-000000000001';
const TAVERN_CELLAR_LOCATION_ID = '00000000-0000-4000-a000-000000000010';
const WALK_STEP_MS = 150; // Milliseconds per tile step

export default function GameCanvas({ playerId }: GameCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [players, setPlayers] = useState<Record<string, PlayerNode>>({});
    const [locationMap, setLocationMap] = useState<LocationMap | null>(null);
    const [myPos, setMyPos] = useState<{ tileX: number; tileY: number }>({ tileX: 9, tileY: 14 });
    const [loading, setLoading] = useState(true);
    const [pendingExit, setPendingExit] = useState<LocationExit | null>(null);
    const [npcs, setNpcs] = useState<NpcNode[]>([]);
    const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity | null>(null);

    // Global Interaction State
    const {
        setActiveNpc,
        addMessage,
        playerCharacter,
        activeQuestId,
        questFlow,
        setQuestFlow,
        setTestQuestState,
    } = useGameState();

    // Combat state
    const [combatState, setCombatState] = useState<CombatState | null>(null);
    const targetSelectCallback = useRef<((targetId: string) => void) | null>(null);

    // Pathfinding state
    const [previewPath, setPreviewPath] = useState<PathNode[]>([]);

    const myId = useRef(playerId);
    const myColor = useRef(`hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const currentLocationId = useRef<string>(DEFAULT_LOCATION_ID);
    const npcsRef = useRef<NpcNode[]>([]);
    const walkingRef = useRef(false); // Ref to detect cancellation inside walking loop
    const myPosRef = useRef(myPos);
    const combatResolutionSentRef = useRef(false);

    const mapServerStateToLocal = (state: string) => {
        if (state === 'OFFERED_BY_MARTA' || state === 'OFFERED_BY_ALDRIC') return 'offered_by_marta' as const;
        if (state === 'COMBAT_REQUIRED' || state === 'ADVENTURE_ACTIVE' || state === 'ACCEPTED') return 'combat_required' as const;
        if (state === 'RETURN_TO_MARTA' || state === 'RETURN_TO_ALDRIC') return 'return_to_marta' as const;
        if (state === 'COMPLETED_SUCCESS') return 'completed_success' as const;
        if (state === 'COMPLETED_FAIL') return 'completed_fail' as const;
        return 'not_started' as const;
    };

    // Keep refs in sync
    useEffect(() => { npcsRef.current = npcs; }, [npcs]);
    useEffect(() => { myPosRef.current = myPos; }, [myPos]);

    useEffect(() => {
        setLocationMap((prev) => {
            if (!prev || prev.id !== TAVERN_LOCATION_ID) return prev;
            const exits = Array.isArray(prev.exits) ? prev.exits : [];
            const hasCellarExit = exits.some((exit) =>
                exit.target_location_id === TAVERN_CELLAR_LOCATION_ID &&
                exit.tile_x === 17 &&
                exit.tile_y === 2,
            );

            const shouldShowCellarExit = !!(
                questFlow?.questLine === 'aldric' &&
                (
                    questFlow.state === 'COMBAT_REQUIRED' ||
                    questFlow.state === 'ADVENTURE_ACTIVE' ||
                    questFlow.state === 'RETURN_TO_ALDRIC' ||
                    (questFlow as any)?.metadata?.cellarEntranceEnabled === true
                )
            );

            if (shouldShowCellarExit && !hasCellarExit) {
                return {
                    ...prev,
                    exits: [
                        ...exits,
                        {
                            tile_x: 17,
                            tile_y: 2,
                            target_location_id: TAVERN_CELLAR_LOCATION_ID,
                            target_location_name: 'Tavern Cellar',
                            spawn_label: 'from_tavern',
                            edge: 'north',
                        },
                    ],
                };
            }

            if (!shouldShowCellarExit && hasCellarExit) {
                return {
                    ...prev,
                    exits: exits.filter((exit) => !(
                        exit.target_location_id === TAVERN_CELLAR_LOCATION_ID &&
                        exit.tile_x === 17 &&
                        exit.tile_y === 2
                    )),
                };
            }

            return prev;
        });
    }, [questFlow?.questLine, questFlow?.state]);

    // ── Parse location from API ────────────────────────────────────────
    function parseLocationFromAPI(loc: any): LocationMap {
        const coords = loc.coordinates;
        return {
            id: loc.id,
            name: loc.name,
            biome_type: loc.biome_type,
            room_type: loc.room_type,
            width: coords.width,
            height: coords.height,
            tiles: coords.tiles,
            spawn_points: coords.spawn_points || [],
            exits: coords.exits || [],
            threat_level: loc.threat_level,
        };
    }

    // ── Load NPCs for a location ───────────────────────────────────────
    async function loadNpcs(locId: string) {
        try {
            const res = await fetch(`${SERVER_URL}/api/location/${locId}/npcs`);
            const data = await res.json();
            if (data.success && data.npcs) {
                setNpcs(data.npcs.map((n: any) => ({
                    id: n.id,
                    name: n.name,
                    title: n.title,
                    tile_x: n.tile_x,
                    tile_y: n.tile_y,
                    sprite_color: n.sprite_color || '#a0522d',
                })));
            }
        } catch (err) {
            console.warn('Failed to load NPCs:', err);
            setNpcs([]);
        }
    }

    // ── Load a location by ID ──────────────────────────────────────────
    async function loadLocationById(locId: string, spawnLabel?: string) {
        setLoading(true);
        setActiveNpc(null);
        setPreviewPath([]);
        try {
            const res = await fetch(`${SERVER_URL}/api/location/${locId}/context?playerId=${encodeURIComponent(myId.current)}`);
            const data = await res.json();
            if (data.success && data.location) {
                const map = parseLocationFromAPI(data.location);
                setLocationMap(map);
                currentLocationId.current = map.id;

                let spawn = map.spawn_points[0];
                if (spawnLabel) {
                    const labeled = map.spawn_points.find(sp => sp.label === spawnLabel);
                    if (labeled) spawn = labeled;
                }
                if (spawn) {
                    setMyPos({ tileX: spawn.x, tileY: spawn.y });
                    persistPosition(map.id, spawn.x, spawn.y);
                }

                subscribeToLocation(map.id);
                await loadNpcs(map.id);

                // System message on arrival
                addMessage({
                    sender: 'System',
                    senderType: 'system',
                    content: `You have arrived at ${map.name}.`
                });

                if (
                    map.id === '00000000-0000-4000-a000-000000000010' &&
                    questFlow?.questLine === 'aldric' &&
                    activeQuestId &&
                    playerCharacter?.id &&
                    (questFlow.state === 'COMBAT_REQUIRED' || questFlow.state === 'ADVENTURE_ACTIVE')
                ) {
                    const started = await startAldricCellarCombat({
                        questId: activeQuestId,
                        playerId: myId.current,
                        characterId: playerCharacter.id,
                    });
                    if (started.combat) {
                        setCombatState(started.combat);
                        combatResolutionSentRef.current = false;
                        addMessage({
                            sender: 'System',
                            senderType: 'system',
                            content: 'Cellar combat started. Defeat the rat and return to Grim Aldric.',
                        });
                    }
                    if (started.flow) {
                        setQuestFlow(started.flow);
                        setTestQuestState(mapServerStateToLocal(started.flow.state));
                    }
                }

            } else {
                loadFallbackLocation();
            }
        } catch {
            loadFallbackLocation();
        } finally {
            setLoading(false);
        }
    }

    // ── Persist position ───────────────────────────────────────────────
    function persistPosition(locId: string, tileX: number, tileY: number) {
        fetch(`${SERVER_URL}/api/player/${myId.current}/position`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ locationId: locId, tileX, tileY }),
        }).catch(() => { /* silent — network failures are transient */ });
    }

    // ── Subscribe to per-location channel ──────────────────────────────
    function subscribeToLocation(locId: string) {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        setPlayers({});

        const channel = supabase.channel(`room:location:${locId}`, {
            config: { broadcast: { self: true } },
        });

        channel
            .on('broadcast', { event: 'player-pos' }, (payload) => {
                setPlayers(cur => ({
                    ...cur,
                    [payload.payload.id]: {
                        id: payload.payload.id,
                        tileX: payload.payload.tileX,
                        tileY: payload.payload.tileY,
                        color: payload.payload.color,
                    },
                }));
            })
            .subscribe();

        channelRef.current = channel;
    }

    // ── Initial load ───────────────────────────────────────────────────
    useEffect(() => {
        async function init() {
            try {
                const posRes = await fetch(`${SERVER_URL}/api/player/${myId.current}/position`);
                const posData = await posRes.json();
                if (posData.success && posData.position) {
                    const pos = posData.position;
                    await loadLocationById(pos.location_id);
                    setMyPos({ tileX: pos.tile_x, tileY: pos.tile_y });
                } else {
                    await loadLocationById(DEFAULT_LOCATION_ID);
                }
            } catch {
                await loadLocationById(DEFAULT_LOCATION_ID);
            }
        }
        init();
        return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
    }, []);

    // ── Broadcast position ─────────────────────────────────────────────
    useEffect(() => {
        if (channelRef.current) {
            channelRef.current.httpSend('player-pos', {
                id: myId.current,
                tileX: myPos.tileX,
                tileY: myPos.tileY,
                color: myColor.current
            }).catch(err => {
                // Gracefully log but don't crash
                console.warn('Broadcasting player pos failed:', err);
            });
        }
    }, [myPos]);

    // ── NPC blocked tiles set ──────────────────────────────────────────
    function getNpcBlockedTiles(): Set<string> {
        const blocked = new Set<string>();
        npcsRef.current.forEach(n => blocked.add(`${n.tile_x},${n.tile_y}`));
        return blocked;
    }

    // ── Check NPC at tile ──────────────────────────────────────────────
    function npcAtTile(tileX: number, tileY: number): NpcNode | undefined {
        return npcsRef.current.find(n => n.tile_x === tileX && n.tile_y === tileY);
    }

    // ── Check adjacency ────────────────────────────────────────────────
    function isAdjacent(ax: number, ay: number, bx: number, by: number): boolean {
        return Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1 && !(ax === bx && ay === by);
    }

    // ── Find exit ──────────────────────────────────────────────────────
    function findExitAtTile(tileX: number, tileY: number): LocationExit | undefined {
        if (!locationMap) return undefined;
        return locationMap.exits.find(e => e.tile_x === tileX && e.tile_y === tileY);
    }

    // ── Walk along path step-by-step ───────────────────────────────────
    async function walkPath(path: PathNode[]) {
        if (path.length === 0) return;
        walkingRef.current = true;
        setPreviewPath([]);

        for (let i = 0; i < path.length; i++) {
            if (!walkingRef.current) break; // Cancelled (new click or location change)

            const step = path[i];

            // Check if an NPC appeared on the next tile (dynamic block)
            if (npcAtTile(step.x, step.y)) break;

            setMyPos({ tileX: step.x, tileY: step.y });

            // Check exit at this step (not the last step - only trigger exit on last)
            if (i === path.length - 1) {
                const exit = findExitAtTile(step.x, step.y);
                if (exit) {
                    // Prompt for transition
                    walkingRef.current = false;
                    setPendingExit(exit);
                    break;
                }
            }

            // Persist position on each step
            persistPosition(currentLocationId.current, step.x, step.y);

            // Wait before next step
            if (i < path.length - 1) {
                await new Promise(resolve => setTimeout(resolve, WALK_STEP_MS));
            }
        }

        walkingRef.current = false;
    }

    // ── Click handler: pathfind & walk ──────────────────────────────────
    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!locationMap || !canvasRef.current || pendingExit) return;

        // If an NPC is currently active in the panel, clicking the canvas deselects them
        setActiveNpc(null);

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const camX = myPosRef.current.tileX * TILE_SIZE - canvas.width / 2 + TILE_SIZE / 2;
        const camY = myPosRef.current.tileY * TILE_SIZE - canvas.height / 2 + TILE_SIZE / 2;

        const tileX = Math.floor((clickX + camX) / TILE_SIZE);
        const tileY = Math.floor((clickY + camY) / TILE_SIZE);

        const distToHero = Math.sqrt(Math.pow(myPosRef.current.tileX - tileX, 2) + Math.pow(myPosRef.current.tileY - tileY, 2));
        if (distToHero > 6) return; // Cannot interact with Fog of War

        // Cancel current walk if clicking while moving
        if (walkingRef.current) {
            walkingRef.current = false;
        }

        // Check if clicking an NPC when adjacent → select globally
        const clickedNpc = npcAtTile(tileX, tileY);
        if (clickedNpc && isAdjacent(myPosRef.current.tileX, myPosRef.current.tileY, tileX, tileY)) {
            setActiveNpc({ id: clickedNpc.id, name: clickedNpc.name });
            return;
        }

        // If clicking an NPC that's NOT adjacent, pathfind to adjacent tile
        if (clickedNpc) {
            const adjacentTiles = [
                { x: tileX - 1, y: tileY }, { x: tileX + 1, y: tileY },
                { x: tileX, y: tileY - 1 }, { x: tileX, y: tileY + 1 },
            ];
            let bestPath: PathNode[] = [];
            const blocked = getNpcBlockedTiles();
            for (const adj of adjacentTiles) {
                if (!isTileWalkable(locationMap, adj.x, adj.y)) continue;
                if (blocked.has(`${adj.x},${adj.y}`)) continue;
                const p = findPath(locationMap, myPosRef.current.tileX, myPosRef.current.tileY, adj.x, adj.y, blocked);
                if (p.length > 0 && (bestPath.length === 0 || p.length < bestPath.length)) {
                    bestPath = p;
                }
            }
            if (bestPath.length > 0) {
                walkPath(bestPath).then(() => {
                    // After walking, check if now adjacent
                    if (isAdjacent(myPosRef.current.tileX, myPosRef.current.tileY, tileX, tileY)) {
                        setActiveNpc({ id: clickedNpc.id, name: clickedNpc.name });
                    }
                });
            }
            return;
        }

        // Normal pathfind & walk
        const blocked = getNpcBlockedTiles();
        const path = findPath(locationMap, myPosRef.current.tileX, myPosRef.current.tileY, tileX, tileY, blocked);
        if (path.length > 0) {
            walkPath(path);
        }
    }, [locationMap, pendingExit, npcs]);

    // ── Mouse move: show path preview ──────────────────────────────────
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!locationMap || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const camX = myPosRef.current.tileX * TILE_SIZE - canvas.width / 2 + TILE_SIZE / 2;
        const camY = myPosRef.current.tileY * TILE_SIZE - canvas.height / 2 + TILE_SIZE / 2;

        const tileX = Math.floor((mouseX + camX) / TILE_SIZE);
        const tileY = Math.floor((mouseY + camY) / TILE_SIZE);

        const distToHero = Math.sqrt(Math.pow(myPosRef.current.tileX - tileX, 2) + Math.pow(myPosRef.current.tileY - tileY, 2));
        if (distToHero > 6) {
            setHoveredEntity(null);
            setPreviewPath([]);
            return;
        }

        // Check NPC hover
        const npc = npcAtTile(tileX, tileY);
        if (npc) {
            setHoveredEntity({
                type: 'npc',
                name: npc.name,
                title: npc.title,
                screenX: mouseX,
                screenY: mouseY,
            });
        } else {
            // Check player hover
            const hPlayer = Object.values(players).find(p => p.tileX === tileX && p.tileY === tileY);
            if (hPlayer) {
                setHoveredEntity({
                    type: 'player',
                    name: hPlayer.id === myId.current ? 'You' : 'Player',
                    screenX: mouseX,
                    screenY: mouseY,
                });
            } else if (tileX === myPosRef.current.tileX && tileY === myPosRef.current.tileY) {
                setHoveredEntity({
                    type: 'player',
                    name: 'You',
                    screenX: mouseX,
                    screenY: mouseY,
                });
            } else {
                setHoveredEntity(null);
            }
        }

        // Path preview (only when NOT walking)
        if (!walkingRef.current && !pendingExit) {
            const blocked = getNpcBlockedTiles();
            let targetX = tileX;
            let targetY = tileY;

            // If hovering NPC, find path to nearest adjacent tile
            if (npc) {
                const adjacentTiles = [
                    { x: tileX - 1, y: tileY }, { x: tileX + 1, y: tileY },
                    { x: tileX, y: tileY - 1 }, { x: tileX, y: tileY + 1 },
                ];
                let bestPath: PathNode[] = [];
                for (const adj of adjacentTiles) {
                    if (!isTileWalkable(locationMap, adj.x, adj.y)) continue;
                    if (blocked.has(`${adj.x},${adj.y}`)) continue;
                    const p = findPath(locationMap, myPosRef.current.tileX, myPosRef.current.tileY, adj.x, adj.y, blocked);
                    if (p.length > 0 && (bestPath.length === 0 || p.length < bestPath.length)) {
                        bestPath = p;
                    }
                }
                setPreviewPath(bestPath);
                return;
            }

            const path = findPath(locationMap, myPosRef.current.tileX, myPosRef.current.tileY, targetX, targetY, blocked);
            setPreviewPath(path);
        }
    }, [locationMap, players, npcs, pendingExit]);

    const handleMouseLeave = useCallback(() => {
        setHoveredEntity(null);
        setPreviewPath([]);
    }, []);

    // ── Transition handlers ───────────────────────
    function handleTransitionConfirm() {
        if (!pendingExit) return;
        const exit = pendingExit;
        setPendingExit(null);
        loadLocationById(exit.target_location_id, exit.spawn_label);
    }

    function handleTransitionCancel() {
        setPendingExit(null);
    }

    // ── Fallback location ──────────────────────────────────────────────
    function loadFallbackLocation() {
        const W = TileType.Wall, F = TileType.Floor, D = TileType.Door;
        const FP = TileType.Fireplace, TB = TileType.Table, CH = TileType.Chair;
        const BA = TileType.Bar, BR = TileType.Barrel, RG = TileType.Rug, V = TileType.Void;
        setNpcs([]);
        setHoveredEntity(null);
        setLocationMap({
            id: 'fallback', name: 'Tavern', biome_type: 'HubRegion', room_type: 'SafeZone',
            width: 12, height: 10, threat_level: 0, spawn_points: [{ x: 5, y: 8 }], exits: [],
            tiles: [
                [W, W, W, W, W, W, W, W, W, W, W, W], [W, F, FP, F, F, F, F, F, F, F, F, W],
                [W, F, F, F, F, RG, RG, F, F, F, F, W], [W, F, TB, CH, F, RG, RG, F, TB, CH, F, W],
                [W, F, CH, TB, F, F, F, F, CH, TB, F, W], [W, F, F, F, F, F, F, F, F, F, F, W],
                [W, BA, BA, BA, F, F, F, F, BR, BR, F, W], [W, F, F, F, F, F, F, F, F, F, F, W],
                [W, W, W, W, W, D, D, W, W, W, W, W], [V, V, V, V, V, F, F, V, V, V, V, V],
            ],
        });
        setMyPos({ tileX: 5, tileY: 8 });
    }

    // ── Render NPC on canvas ───────────────────────────────────────────
    function renderNpc(ctx: CanvasRenderingContext2D, npc: NpcNode, camX: number, camY: number) {
        const px = npc.tile_x * TILE_SIZE - camX + TILE_SIZE / 2;
        const py = npc.tile_y * TILE_SIZE - camY + TILE_SIZE / 2;
        const r = TILE_SIZE * 0.35;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.rect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
        ctx.fillStyle = npc.sprite_color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = 'rgba(10, 8, 6, 0.7)';
        ctx.font = 'bold 9px serif';
        const nameWidth = ctx.measureText(npc.name).width;
        ctx.fillRect(px - nameWidth / 2 - 3, py - TILE_SIZE * 0.7 - 7, nameWidth + 6, 12);
        ctx.fillStyle = '#d4a854';
        ctx.textAlign = 'center';
        ctx.fillText(npc.name, px, py - TILE_SIZE * 0.7);
        ctx.textAlign = 'start';
    }

    // ── Render path preview ────────────────────────────────────────────
    function renderPathPreview(ctx: CanvasRenderingContext2D, path: PathNode[], camX: number, camY: number) {
        if (path.length === 0) return;

        const pulse = 0.5 + 0.3 * Math.sin(Date.now() / 300);

        // Draw path dots
        path.forEach((node, i) => {
            const px = node.x * TILE_SIZE - camX + TILE_SIZE / 2;
            const py = node.y * TILE_SIZE - camY + TILE_SIZE / 2;
            const isLast = i === path.length - 1;

            // Connecting line to next node
            if (i < path.length - 1) {
                const nextPx = path[i + 1].x * TILE_SIZE - camX + TILE_SIZE / 2;
                const nextPy = path[i + 1].y * TILE_SIZE - camY + TILE_SIZE / 2;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(nextPx, nextPy);
                ctx.strokeStyle = `rgba(217, 163, 60, ${0.25 * pulse})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Dot
            ctx.beginPath();
            const dotRadius = isLast ? 5 : 3;
            ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = isLast
                ? `rgba(217, 163, 60, ${0.7 * pulse})`
                : `rgba(217, 163, 60, ${0.4 * pulse})`;
            ctx.fill();

            // Glow on destination
            if (isLast) {
                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(217, 163, 60, 0.6)';
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });

        // Step count label at destination
        const last = path[path.length - 1];
        const destPx = last.x * TILE_SIZE - camX + TILE_SIZE / 2;
        const destPy = last.y * TILE_SIZE - camY + TILE_SIZE / 2;
        ctx.font = 'bold 10px monospace';
        const label = `${path.length}`;
        const labelW = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(10, 8, 6, 0.8)';
        ctx.fillRect(destPx - labelW / 2 - 3, destPy - TILE_SIZE * 0.6 - 8, labelW + 6, 14);
        ctx.fillStyle = '#d9a33c';
        ctx.textAlign = 'center';
        ctx.fillText(label, destPx, destPy - TILE_SIZE * 0.6 + 3);
        ctx.textAlign = 'start';
    }

    // ── Render Loop ─────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.parentElement || !locationMap) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            if (!canvas.parentElement) return;
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;

            const camX = myPos.tileX * TILE_SIZE - canvas.width / 2 + TILE_SIZE / 2;
            const camY = myPos.tileY * TILE_SIZE - canvas.height / 2 + TILE_SIZE / 2;

            renderLocation(ctx, locationMap, camX, camY, TILE_SIZE, canvas.width, canvas.height);

            // Path preview
            renderPathPreview(ctx, previewPath, camX, camY);

            // Exit indicators
            locationMap.exits.forEach(exit => {
                const px = exit.tile_x * TILE_SIZE - camX + TILE_SIZE / 2;
                const py = exit.tile_y * TILE_SIZE - camY + TILE_SIZE / 2;
                const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
                ctx.beginPath();
                ctx.arc(px, py, TILE_SIZE * 0.2 * (0.8 + 0.2 * pulse), 0, Math.PI * 2);
                ctx.fillStyle = `rgba(217, 119, 6, ${0.4 + 0.3 * pulse})`;
                ctx.fill();
                ctx.save();
                ctx.shadowBlur = 12;
                ctx.shadowColor = 'rgba(217, 119, 6, 0.5)';
                ctx.fill();
                ctx.restore();
            });

            // Draw NPCs
            npcsRef.current.forEach(npc => renderNpc(ctx, npc, camX, camY));

            // Draw other players
            Object.values(players).forEach(p => {
                if (p.id !== myId.current) {
                    renderPlayer(ctx, p.tileX, p.tileY, p.color, TILE_SIZE, camX, camY, false);
                }
            });

            // Draw local player
            renderPlayer(ctx, myPos.tileX, myPos.tileY, myColor.current, TILE_SIZE, camX, camY, true);

            // Draw Fog of War over everything (except the HUD)
            renderFogOfWar(ctx, myPos.tileX, myPos.tileY, TILE_SIZE, camX, camY, canvas.width, canvas.height, 6);

            // HUD
            ctx.font = 'bold 14px serif';
            const textWidth = ctx.measureText(`📍 ${locationMap.name}`).width;
            ctx.fillStyle = 'rgba(10, 8, 6, 0.75)';
            ctx.fillRect(8, 8, textWidth + 24, 32);
            ctx.strokeStyle = 'rgba(176, 138, 74, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(8, 8, textWidth + 24, 32);
            ctx.fillStyle = '#b08a4a';
            ctx.fillText(`📍 ${locationMap.name}`, 16, 29);

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [players, myPos, locationMap, npcs, previewPath]);

    if (loading) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0806]">
                <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-crosshair"
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            />

            {/* Tooltip */}
            {hoveredEntity && (
                <Tooltip
                    x={hoveredEntity.screenX}
                    y={hoveredEntity.screenY}
                    name={hoveredEntity.name}
                    title={hoveredEntity.title}
                    type={hoveredEntity.type}
                />
            )}

            {/* Transition UI */}
            {pendingExit && (
                <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0a] border border-amber-900/50 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-sm text-center transform scale-100 transition-all">
                        <h3 className="text-2xl font-cinzel font-bold text-amber-500 mb-2 tracking-widest uppercase">New Location</h3>
                        <p className="text-stone-400 font-inter text-sm mb-6 leading-relaxed">
                            Do you want to travel to <span className="text-amber-200 font-medium">this destination</span>?
                        </p>
                        <div className="flex gap-4 justify-center mt-4">
                            <button
                                onClick={handleTransitionCancel}
                                className="px-6 py-2.5 rounded-xl border border-stone-800 text-stone-400 font-cinzel font-bold text-xs tracking-widest hover:bg-[#111] hover:text-stone-200 transition-colors uppercase"
                            >
                                Stay
                            </button>
                            <button
                                onClick={handleTransitionConfirm}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-amber-50 font-cinzel font-bold text-xs tracking-widest border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all uppercase"
                            >
                                Travel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Combat Overlay */}
            {combatState && combatState.status !== 'VICTORY' && combatState.status !== 'DEFEAT' && (
                <CombatOverlay
                    combatState={combatState}
                    playerId={myId.current}
                    characterId={myId.current}
                    onCombatUpdate={(state) => setCombatState(state)}
                    onCombatEnd={(result) => {
                        console.log('Combat ended:', result);
                        if (
                            !combatResolutionSentRef.current &&
                            questFlow?.questLine === 'aldric' &&
                            activeQuestId
                        ) {
                            combatResolutionSentRef.current = true;
                            const combatOutcome = result === 'VICTORY' ? 'success' : 'fail';
                            submitAldricCombatResult({
                                questId: activeQuestId,
                                playerId: myId.current,
                                combatOutcome,
                                combatId: combatState?.combatId,
                            })
                                .then((payload) => {
                                    if (payload.flow) {
                                        setQuestFlow(payload.flow);
                                        setTestQuestState(mapServerStateToLocal(payload.flow.state));
                                    }
                                    addMessage({
                                        sender: 'System',
                                        senderType: 'system',
                                        content: combatOutcome === 'success'
                                            ? 'The rat is dead. Return to Grim Aldric for turn-in.'
                                            : 'You were defeated in the cellar. Return to Grim Aldric.',
                                    });
                                })
                                .catch((err: any) => {
                                    addMessage({
                                        sender: 'System',
                                        senderType: 'system',
                                        content: err?.message || 'Failed to submit cellar combat result.',
                                    });
                                });
                        }
                        setTimeout(() => setCombatState(null), 3000);
                    }}
                    onSelectTarget={(callback) => {
                        targetSelectCallback.current = callback;
                    }}
                />
            )}
        </>
    );
}
