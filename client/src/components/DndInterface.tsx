import { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import GameCanvas from '@/components/GameCanvas';
import DiceOverlay, { DiceType } from '@/components/DiceOverlay';
import Header from './dnd-interface/Header';
import InteractionPanel from './dnd-interface/InteractionPanel';
import DraggableItem from './dnd-interface/DraggableItem';
import { useGameState } from '@/store/useGameState';
import ZkDiceOverlay from './dnd-interface/ZkDiceOverlay';

interface DndInterfaceProps {
    playerId: string;
    walletAddress: string;
}

export default function DndInterface({ playerId, walletAddress }: DndInterfaceProps) {
    const { inventory, addToInventory, removeFromInventory, addMessage } = useGameState();
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [activeDragSource, setActiveDragSource] = useState<'chat' | 'inventory' | null>(null);

    // Global Dice State within Workspace
    const [isRolling, setIsRolling] = useState(false);
    const [diceType, setDiceType] = useState<DiceType>('d20');
    const [diceResult, setDiceResult] = useState<number | null>(null);
    const [zkReceipt, setZkReceipt] = useState<string | null>(null);

    const triggerRoll = (type: DiceType) => {
        if (isRolling) return;
        setDiceType(type);
        setIsRolling(true);
        setDiceResult(null);
        setZkReceipt(null);

        if (type === 'ZK_LOOT') {
            const generateZkRoll = async () => {
                try {
                    // Start roll procedure; ZkDiceOverlay handles its own internal steps 1 and 2
                    // We just await the heavy API call here

                    const testSeed = `Quest-${Date.now()}-Loot`;

                    const response = await fetch('http://localhost:3001/api/zk/prove-roll', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ seed: testSeed, bound: 100 })
                    });

                    if (!response.ok) throw new Error("Failed to generate ZK Proof");
                    const data = await response.json();

                    const result = data.result.result;
                    setDiceResult(result);
                    setZkReceipt(data.receipt_base64);

                    addMessage({
                        sender: 'System',
                        senderType: 'system',
                        content: `[ZK RECEIPT VERIFIED] Generated loot score: ${result}\nReceipt: ${data.receipt_base64.substring(0, 32)}...`,
                        flavorText: 'Verifying off-chain results...'
                    });

                    // Transition quest to completed
                    const { testQuestState, setTestQuestState } = useGameState.getState();
                    if (testQuestState === 'combat') {
                        setTestQuestState('completed');

                        // Final dialog
                        addMessage({
                            sender: 'Game Master',
                            senderType: 'dm',
                            content: 'You have done well. Your trial is complete. Archive the results and claim your reward.',
                            flavorText: 'He gestures towards the exit.'
                        });
                    }
                } catch (error) {
                    console.error("ZK Prove error", error);
                    setIsRolling(false);
                }
            };

            generateZkRoll();
            return;
        }

        setTimeout(() => {
            const max = parseInt(type.substring(1)) || 20;
            const result = Math.floor(Math.random() * max) + 1;
            setDiceResult(result);

            addMessage({
                sender: 'Player',
                senderType: 'player',
                content: `Rolled ${type}: ${result}`,
            });

            setTimeout(() => setIsRolling(false), 3000);
        }, 500);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveDragId(active.id as string);
        setActiveDragSource(active.data.current?.source as 'chat' | 'inventory');
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        setActiveDragSource(null);

        const { active, over } = event;
        if (!over) return;

        const source = active.data.current?.source;
        const dropzoneType = over.data.current?.type;
        const itemId = active.id as string;

        // RULE 1: Chat -> Inventory (Loot Pickup)
        if (source === 'chat' && (dropzoneType === 'inventory' || over.id === 'inventory-btn-dropzone' || over.id === 'inventory-menu-dropzone')) {
            const newItem = {
                id: crypto.randomUUID(),
                name: 'Mysterious Loot',
                description: 'You picked this up from the adventure.',
                type: 'misc' as const,
            };

            addToInventory(newItem);
            addMessage({
                sender: 'System',
                senderType: 'system',
                content: `You picked up ${newItem.name}.`,
            });
        }

        // RULE 2: Inventory -> Chat (Item Usage)
        if (source === 'inventory' && dropzoneType === 'chat') {
            const item = inventory.find(i => i.id === itemId);
            if (item) {
                removeFromInventory(itemId);
                addMessage({
                    sender: 'Player',
                    senderType: 'player',
                    content: `*Uses ${item.name}*`,
                });
            }
        }
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
            <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#040404] text-amber-50 font-inter selection:bg-amber-900/50 selection:text-amber-100">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.10),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(16,185,129,0.08),transparent_20%),linear-gradient(180deg,#050505_0%,#020202_100%)]" />
                <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:72px_72px]" />
                {/* Global Header */}
                <Header walletAddress={walletAddress} />

                {/* Resizable Workspaces */}
                <ResizablePanelGroup direction="horizontal" className="relative z-10 flex-1 w-full h-full">

                    {/* Left Panel: Game Canvas Area */}
                    <ResizablePanel defaultSize={60} minSize={30} className="relative h-full flex flex-col bg-[#050505]">
                        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_16%,transparent_84%,rgba(255,255,255,0.02))]" />

                        {/* The 3D Canvas */}
                        <div className="w-full h-full relative cursor-crosshair overflow-hidden">
                            <GameCanvas playerId={playerId} />
                            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.92),inset_0_0_24px_rgba(245,158,11,0.08)]" />

                            {diceType === 'ZK_LOOT' ? (
                                <ZkDiceOverlay
                                    rolling={isRolling}
                                    diceType="ZK"
                                    result={diceResult}
                                    receipt={zkReceipt}
                                    onReset={() => {
                                        setIsRolling(false);
                                        setDiceResult(null);
                                        setZkReceipt(null);
                                    }}
                                />
                            ) : (
                                <DiceOverlay
                                    rolling={isRolling}
                                    diceType={diceType}
                                    result={diceResult}
                                    onReset={() => {
                                        setIsRolling(false);
                                        setDiceResult(null);
                                    }}
                                />
                            )}
                        </div>
                    </ResizablePanel>

                    {/* Central Handle */}
                    <ResizableHandle withHandle className="relative z-20 w-2 bg-transparent transition-all before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-gradient-to-b before:from-transparent before:via-amber-600/60 before:to-transparent hover:before:via-amber-300/80" />

                    {/* Right Panel: Interaction & Chat */}
                    <ResizablePanel defaultSize={40} minSize={25} className="relative h-full flex flex-col border-l border-amber-900/20 bg-[linear-gradient(180deg,rgba(18,15,13,0.98)_0%,rgba(12,10,9,0.98)_100%)] shadow-[-20px_0_60px_rgba(0,0,0,0.72)]">
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />
                        <InteractionPanel triggerRoll={triggerRoll} />
                    </ResizablePanel>

                </ResizablePanelGroup>
            </div>

            {/* Visual Overlay while dragging */}
            <DragOverlay dropAnimation={{
                duration: 250,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
                {activeDragId ? (
                    <div className="opacity-95 scale-105 pointer-events-none rotate-3">
                        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-700 to-amber-600 border border-amber-400 text-amber-50 px-4 py-2 rounded-xl text-xs font-cinzel font-bold tracking-widest uppercase shadow-[0_10px_30px_rgba(245,158,11,0.5)] backdrop-blur-md">
                            {activeDragSource === 'chat' ? '🛍️ Grabbing Loot...' : '⚔️ Using Item...'}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>

        </DndContext>
    );
}
