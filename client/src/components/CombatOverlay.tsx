'use client';

import { useState, useEffect, useRef } from 'react';
import { CombatState, CombatEntity, CombatLog, CombatAction, CombatActionType } from 'shared';
import { SERVER_URL } from '@/lib/config';

interface CombatOverlayProps {
    combatState: CombatState;
    playerId: string;
    characterId: string;
    onCombatUpdate: (state: CombatState) => void;
    onCombatEnd: (result: 'VICTORY' | 'DEFEAT') => void;
    onSelectTarget: (callback: (targetId: string) => void) => void;
}

export default function CombatOverlay({
    combatState,
    playerId,
    characterId,
    onCombatUpdate,
    onCombatEnd,
    onSelectTarget,
}: CombatOverlayProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedAction, setSelectedAction] = useState<CombatActionType | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);
    const entityId = `player_${characterId}`;

    const isMyTurn = combatState.activeEntityId === entityId;
    const myEntity = combatState.entities[entityId];
    const activeEntity = combatState.entities[combatState.activeEntityId];

    // Auto-scroll combat log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [combatState.logs.length]);

    // Detect combat end
    useEffect(() => {
        if (combatState.status === 'VICTORY' || combatState.status === 'DEFEAT') {
            onCombatEnd(combatState.status);
        }
    }, [combatState.status]);

    async function submitAction(action: CombatAction) {
        setIsSubmitting(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/combat/${combatState.combatId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: characterId, action }),
            });
            const data = await res.json();
            if (data.success && data.combat) {
                onCombatUpdate(data.combat);
            }
        } catch (err) {
            console.error('Combat action failed:', err);
        } finally {
            setIsSubmitting(false);
            setSelectedAction(null);
        }
    }

    function handleAttack(type: 'MELEE_ATTACK' | 'RANGED_ATTACK') {
        setSelectedAction(type);
        onSelectTarget((targetId: string) => {
            submitAction({ type, targetId });
        });
    }

    function handleSpell() {
        setSelectedAction('CAST_SPELL');
        onSelectTarget((targetId: string) => {
            submitAction({ type: 'CAST_SPELL', targetId });
        });
    }

    async function handleEndTurn() {
        setIsSubmitting(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/combat/${combatState.combatId}/end-turn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId: characterId }),
            });
            const data = await res.json();
            if (data.success && data.combat) {
                onCombatUpdate(data.combat);
            }
        } catch (err) {
            console.error('End turn failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    }

    function getEntityColor(entity: CombatEntity): string {
        if (entity.id === entityId) return '#4ade80'; // Green for self
        if (entity.type === 'PLAYER') return '#60a5fa'; // Blue for allies
        return '#ef4444'; // Red for enemies
    }

    function getHpBarColor(hp: number, maxHp: number): string {
        const ratio = hp / maxHp;
        if (ratio > 0.6) return '#22c55e';
        if (ratio > 0.3) return '#eab308';
        return '#ef4444';
    }

    return (
        <div className="absolute inset-0 pointer-events-none z-50">
            {/* ── Turn Queue Bar (Top) ─────────────────────────── */}
            <div className="pointer-events-auto absolute top-0 left-0 right-0 flex items-center justify-center gap-2 p-3 bg-gradient-to-b from-[#050505] to-transparent">
                <span className="text-amber-500 text-[10px] font-cinzel font-bold tracking-widest uppercase mr-2 mt-1">
                    Round {combatState.round}
                </span>
                {combatState.turnQueue.map((id) => {
                    const entity = combatState.entities[id];
                    if (!entity) return null;
                    const isActive = id === combatState.activeEntityId;
                    const isDead = entity.hp <= 0;
                    return (
                        <div
                            key={id}
                            className={`
                                flex flex-col items-center px-3 py-1.5 rounded-lg text-xs font-inter font-bold transition-all shadow-sm
                                ${isActive ? 'bg-[#100c08] border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-110 z-10' : 'bg-[#0a0a0a] border border-stone-800'}
                                ${isDead ? 'opacity-30 line-through' : ''}
                            `}
                            style={{ color: getEntityColor(entity) }}
                        >
                            <span className="truncate max-w-[70px] drop-shadow-sm">{entity.name}</span>
                            <div className="w-12 h-1.5 mt-1 rounded-full bg-[#050505] overflow-hidden border border-stone-800">
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${(entity.hp / entity.maxHp) * 100}%`,
                                        backgroundColor: getHpBarColor(entity.hp, entity.maxHp),
                                        boxShadow: `0 0 5px ${getHpBarColor(entity.hp, entity.maxHp)}80`
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Combat Log (Right side) ──────────────────────── */}
            <div className="pointer-events-auto absolute right-4 top-20 bottom-24 w-72 bg-[#050505]/95 border border-amber-900/30 rounded-xl overflow-hidden flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
                <div className="px-4 py-2 bg-[#0a0a0a] text-amber-500/80 text-[10px] font-cinzel font-bold uppercase tracking-widest border-b border-amber-900/40 relative">
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
                    ⚔️ Combat Log
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 text-xs font-inter custom-scrollbar">
                    {combatState.logs.map((log, i) => (
                        <div key={log.id || i} className="text-stone-300 leading-relaxed border-b border-stone-800/50 pb-2 last:border-0">
                            {log.isHit !== undefined && (
                                <span className={`font-bold mr-1 ${log.isHit ? 'text-red-400 drop-shadow-[0_0_2px_rgba(248,113,113,0.5)]' : 'text-stone-500'}`}>
                                    [{log.isHit ? 'HIT' : 'MISS'}]
                                    {log.roll && ` (${log.roll.total})`}
                                    {log.damage ? ` -${log.damage}HP` : ''}
                                    {' '}
                                </span>
                            )}
                            <span className="text-amber-100/90">{log.narrative}</span>
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            </div>

            {/* ── Action Panel (Bottom) ────────────────────────── */}
            {isMyTurn && myEntity && myEntity.hp > 0 && (
                <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-[#0a0a0a] border border-amber-900/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                    <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

                    <span className="text-amber-400 text-[10px] uppercase tracking-widest font-cinzel font-bold mr-2 animate-pulse">YOUR TURN</span>

                    <button
                        onClick={() => handleAttack('MELEE_ATTACK')}
                        disabled={isSubmitting}
                        className={`px-4 py-2 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider transition-all shadow-inner
                            ${selectedAction === 'MELEE_ATTACK'
                                ? 'bg-red-900/80 text-white border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                : 'bg-[#100c08] border border-red-900/50 text-red-400 hover:bg-[#150f0a] hover:border-red-500/50 hover:text-red-300'}
                            disabled:opacity-40 disabled:hover:border-red-900/50`}
                    >
                        ⚔️ Melee
                    </button>

                    <button
                        onClick={() => handleAttack('RANGED_ATTACK')}
                        disabled={isSubmitting}
                        className={`px-4 py-2 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider transition-all shadow-inner
                            ${selectedAction === 'RANGED_ATTACK'
                                ? 'bg-sky-900/80 text-white border border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)]'
                                : 'bg-[#100c08] border border-sky-900/50 text-sky-400 hover:bg-[#150f0a] hover:border-sky-500/50 hover:text-sky-300'}
                            disabled:opacity-40 disabled:hover:border-sky-900/50`}
                    >
                        🏹 Ranged
                    </button>

                    <button
                        onClick={handleSpell}
                        disabled={isSubmitting}
                        className={`px-4 py-2 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider transition-all shadow-inner
                            ${selectedAction === 'CAST_SPELL'
                                ? 'bg-purple-900/80 text-white border border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                : 'bg-[#100c08] border border-purple-900/50 text-purple-400 hover:bg-[#150f0a] hover:border-purple-500/50 hover:text-purple-300'}
                            disabled:opacity-40 disabled:hover:border-purple-900/50`}
                    >
                        ✨ Spell
                    </button>

                    <button
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider bg-[#100c08] border border-emerald-900/50 text-emerald-400 hover:bg-[#150f0a] hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40 disabled:hover:border-emerald-900/50 transition-all shadow-inner"
                    >
                        🧪 Item
                    </button>

                    <div className="w-px h-8 bg-stone-800 mx-1" />

                    <button
                        onClick={handleEndTurn}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-cinzel font-bold uppercase tracking-wider bg-gradient-to-r from-amber-900/50 to-[#100c08] border border-amber-700/50 text-amber-200 hover:from-amber-800/60 hover:to-[#150f0a] hover:border-amber-500/50 hover:text-amber-100 disabled:opacity-40 transition-all shadow-inner group"
                    >
                        <span className="group-hover:translate-x-1 inline-block transition-transform duration-200">⏭️ End Turn</span>
                    </button>
                </div>
            )}

            {/* ── Waiting indicator ─────────────────────────────── */}
            {!isMyTurn && combatState.status === 'IN_PROGRESS' && activeEntity && (
                <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-3 bg-[#050505]/90 border border-stone-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                    <span className="text-stone-400 text-xs font-cinzel font-bold tracking-widest uppercase animate-pulse drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]">
                        ⏳ {activeEntity.name}'s turn...
                    </span>
                </div>
            )}

            {/* ── Victory/Defeat banner ─────────────────────────── */}
            {(combatState.status === 'VICTORY' || combatState.status === 'DEFEAT') && (
                <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm z-60 animate-in fade-in duration-500">
                    <div className={`text-center px-16 py-12 rounded-3xl border-2 shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden ${combatState.status === 'VICTORY'
                        ? 'bg-[#0a0a0a] border-emerald-900/50 text-emerald-400'
                        : 'bg-[#0a0a0a] border-red-900/50 text-red-400'
                        }`}>
                        <div className={`absolute -inset-10 blur-3xl opacity-20 -z-10 ${combatState.status === 'VICTORY' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <div className="text-5xl font-cinzel font-bold mb-4 tracking-widest uppercase drop-shadow-[0_0_15px_currentColor]">
                            {combatState.status === 'VICTORY' ? '⚔️ VICTORY!' : '💀 DEFEAT!'}
                        </div>
                        <div className="text-lg font-inter text-stone-400 opacity-80">
                            {combatState.status === 'VICTORY'
                                ? 'All enemies have been vanquished.'
                                : 'Your party has fallen in battle.'}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Target selection hint ─────────────────────────── */}
            {selectedAction && (
                <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#050505]/95 border border-amber-500/30 text-amber-200 text-xs font-cinzel uppercase tracking-widest font-bold rounded-xl animate-pulse shadow-[0_5px_20px_rgba(245,158,11,0.2)] backdrop-blur-sm">
                    🎯 Click an enemy on the map to target
                </div>
            )}
        </div>
    );
}
