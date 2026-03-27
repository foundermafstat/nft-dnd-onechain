import { create } from 'zustand';
import type { MartaQuestFlow } from 'shared';

export type ActorType = 'player' | 'enemy' | 'ally' | 'system' | 'dm';
export type TurnOrder = 'player' | 'enemy' | 'ally';
export type TestQuestState =
    | 'not_started'
    | 'offered_by_marta'
    | 'combat_required'
    | 'return_to_marta'
    | 'completed_success'
    | 'completed_fail';

export interface ChatMessage {
    id: string;
    sender: string;
    senderType: ActorType;
    content: string;
    quickReplies?: Array<{ label: string; payload: string }>;
    itemId?: string; // If this message spawned an item
    timestamp: number;
    flavorText?: string;
    flavorPosition?: 'top' | 'bottom';
    txHash?: string;
    txUrl?: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    type: 'weapon' | 'armor' | 'consumable' | 'misc';
    icon?: string;
}

export interface Entity {
    id: string;
    name: string;
    type: ActorType;
    hp: number;
    maxHp: number;
    isDead: boolean;
    statusEffects: string[];
}

interface GameState {
    // Turn State
    currentTurn: TurnOrder;
    setTurn: (turn: TurnOrder) => void;

    // Test Quest State
    testQuestState: TestQuestState;
    setTestQuestState: (state: TestQuestState) => void;
    activeQuestId: string | null;
    setActiveQuestId: (id: string | null) => void;
    testQuestSessionId: number | null;
    setTestQuestSessionId: (id: number | null) => void;
    questFlow: MartaQuestFlow | null;
    setQuestFlow: (flow: MartaQuestFlow | null) => void;
    resetQuestFlow: () => void;

    // NPC Dialog State
    activeNpc: { id: string, name: string } | null;
    setActiveNpc: (npc: { id: string, name: string } | null) => void;

    // Chat Log
    chatMessages: ChatMessage[];
    addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp' | 'flavorText' | 'flavorPosition'> & { flavorText?: string; flavorPosition?: 'top' | 'bottom' }) => void;
    removeMessage: (id: string) => void;
    removeQuestOfferMessagesForNpc: (npcName: string) => void;

    // Inventory
    inventory: InventoryItem[];
    addToInventory: (item: InventoryItem) => void;
    removeFromInventory: (id: string) => void;

    // Entities on Map
    entities: Entity[];
    setEntities: (entities: Entity[]) => void;
    updateEntityHp: (id: string, hpOffset: number) => void;

    // Player Data
    playerCharacter: any | null;
    setPlayerCharacter: (char: any | null) => void;

    // Dice context
    lastDiceRoll: { type: string; value: number; at: number } | null;
    setLastDiceRoll: (roll: { type: string; value: number; at?: number } | null) => void;
    pendingDiceRequest: string | null;
    setPendingDiceRequest: (dice: string | null) => void;

    resetForAuthSession: () => void;
}

function buildInitialChatMessages(): ChatMessage[] {
    return [
        {
            id: 'system-start',
            sender: 'System',
            senderType: 'system',
            content: 'Adventure begins...',
            timestamp: Date.now(),
        }
    ];
}

function buildStarterInventory(): InventoryItem[] {
    return [
        { id: crypto.randomUUID(), name: 'Health Potion', description: 'Restores 10 HP', type: 'consumable' },
        { id: crypto.randomUUID(), name: 'Shortsword', description: '1d6 slashing', type: 'weapon' },
    ];
}

export const useGameState = create<GameState>((set) => ({
    currentTurn: 'player',
    setTurn: (turn) => set({ currentTurn: turn }),

    testQuestState: 'not_started',
    setTestQuestState: (state) => set({ testQuestState: state }),
    activeQuestId: null,
    setActiveQuestId: (id) => set({ activeQuestId: id }),
    testQuestSessionId: null,
    setTestQuestSessionId: (id) => set({ testQuestSessionId: id }),
    questFlow: null,
    setQuestFlow: (flow) => set({ questFlow: flow }),
    resetQuestFlow: () => set({
        questFlow: null,
        activeQuestId: null,
        testQuestSessionId: null,
        testQuestState: 'not_started',
    }),

    activeNpc: null,
    setActiveNpc: (npc) => set({ activeNpc: npc }),

    chatMessages: buildInitialChatMessages(),
    addMessage: (msg) =>
        set((state) => {
            let flavorText = msg.flavorText;
            let flavorPosition = msg.flavorPosition;

            // Generate random flavor text for DM, enemy, and system messages
            if ((msg.senderType === 'dm' || msg.senderType === 'enemy' || msg.senderType === 'system') && !flavorText) {
                const FLAVORS = [
                    "A cold draft sweeps through the space.",
                    "The scent of ancient dust lingers in the air.",
                    "Shadows dance dynamically along the uneven walls.",
                    "A distant echo momentarily breaks the silence.",
                    "The ambient light shifts subtly as you act.",
                    "Motes of dust float lazily in the dim light.",
                    "The air here tastes metallic and stale.",
                    "Something skitters lightly in the dark beyond your vision.",
                    "A faint hum vibrates through the floorboards.",
                    "The quiet feels almost heavy and expectant."
                ];
                flavorText = FLAVORS[Math.floor(Math.random() * FLAVORS.length)];
                flavorPosition = Math.random() > 0.5 ? 'top' : 'bottom';
            }

            return {
                chatMessages: [
                    ...state.chatMessages,
                    { ...msg, id: crypto.randomUUID(), timestamp: Date.now(), flavorText, flavorPosition },
                ],
            };
        }),
    removeMessage: (id) =>
        set((state) => ({
            chatMessages: state.chatMessages.filter((m) => m.id !== id),
        })),
    removeQuestOfferMessagesForNpc: (npcName) =>
        set((state) => ({
            chatMessages: state.chatMessages.filter((m) => {
                if (m.sender !== npcName || !Array.isArray(m.quickReplies) || m.quickReplies.length === 0) return true;
                const labels = m.quickReplies.map((reply) => reply.label.trim().toLowerCase());
                return !(labels.includes('agree') && labels.includes('decline'));
            }),
        })),

    inventory: buildStarterInventory(),
    addToInventory: (item) =>
        set((state) => ({
            inventory: [...state.inventory, item],
        })),
    removeFromInventory: (id) =>
        set((state) => ({
            inventory: state.inventory.filter((i) => i.id !== id),
        })),

    entities: [],
    setEntities: (entities) => set({ entities }),
    updateEntityHp: (id, hpOffset) =>
        set((state) => ({
            entities: state.entities.map((e) => {
                if (e.id === id) {
                    const newHp = Math.max(0, Math.min(e.maxHp, e.hp + hpOffset));
                    return { ...e, hp: newHp, isDead: newHp === 0 };
                }
                return e;
            }),
        })),

    playerCharacter: null,
    setPlayerCharacter: (char) => set({ playerCharacter: char }),

    lastDiceRoll: null,
    setLastDiceRoll: (roll) => set({
        lastDiceRoll: roll ? { type: roll.type, value: roll.value, at: roll.at ?? Date.now() } : null,
    }),
    pendingDiceRequest: null,
    setPendingDiceRequest: (dice) => set({ pendingDiceRequest: dice }),

    resetForAuthSession: () => set({
        currentTurn: 'player',
        testQuestState: 'not_started',
        activeQuestId: null,
        testQuestSessionId: null,
        questFlow: null,
        activeNpc: null,
        chatMessages: buildInitialChatMessages(),
        inventory: buildStarterInventory(),
        entities: [],
        playerCharacter: null,
        lastDiceRoll: null,
        pendingDiceRequest: null,
    }),
}));
