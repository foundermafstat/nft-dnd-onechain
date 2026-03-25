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
            <div className="flex flex-col h-screen w-full bg-[#050505] text-amber-50 overflow-hidden font-inter selection:bg-amber-900/50 selection:text-amber-100">
                {/* Global Header */}
                <Header walletAddress={walletAddress} />

                {/* Resizable Workspaces */}
                <ResizablePanelGroup direction="horizontal" className="flex-1 w-full h-full">

                    {/* Left Panel: Game Canvas Area */}
                    <ResizablePanel defaultSize={60} minSize={30} className="relative h-full flex flex-col bg-[#0a0a0a]">

                        {/* The 3D Canvas */}
                        <div className="w-full h-full relative cursor-crosshair">
                            <GameCanvas playerId={playerId} />

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
                    <ResizableHandle withHandle className="bg-amber-900/30 w-1.5 hover:bg-amber-500/50 hover:w-2 transition-all" />

                    {/* Right Panel: Interaction & Chat */}
                    <ResizablePanel defaultSize={40} minSize={25} className="h-full flex flex-col bg-[#050505] border-l border-amber-900/20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
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
