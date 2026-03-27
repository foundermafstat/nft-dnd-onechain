import { SERVER_URL } from './config';


export interface QuestHistoryEntry {
    id: string;
    quest_id: string;
    location_id: string | null;
    player_action: string | null;
    player_background: string | null;
    player_roll: number | null;
    dm_roll: number | null;
    ai_narrative: string | null;
    engine_trigger: string | null;
    on_chain_event: boolean;
    movement_vector: any;
    created_at: string;
}

export interface Quest {
    id: string;
    party_members: string[];
    status: 'InProgress' | 'Success' | 'PartyWiped';
    start_time: string;
    end_time: string | null;
    loot_dropped: boolean;
    stat_changes: any;
    created_at: string;
}

export interface QuestRewardTx {
    item_id: string;
    item_name: string;
    tx_hash: string;
    onechain_token_id: string | null;
    metadata_cid?: string;
    lore_cid?: string;
    image_url?: string;
    created_at?: string;
    hero?: {
      character_id?: string;
      hero_name?: string;
      hero_class?: string;
      hero_ancestry?: string;
      level?: number;
      alignment?: string;
      sbt?: Record<string, any> | null;
    };
}

export async function fetchQuests(): Promise<Quest[]> {
    const res = await fetch(`${SERVER_URL}/api/quest/list`);
    const data = await res.json();
    return data.quests || [];
}

export async function fetchQuestById(id: string): Promise<Quest | null> {
    const res = await fetch(`${SERVER_URL}/api/quest/${id}`);
    const data = await res.json();
    return data.quest || null;
}

export async function fetchQuestHistory(questId: string): Promise<QuestHistoryEntry[]> {
    const res = await fetch(`${SERVER_URL}/api/quest/${questId}/history`);
    const data = await res.json();
    return data.history || [];
}

export async function fetchQuestRewardTx(questId: string): Promise<QuestRewardTx[]> {
    const res = await fetch(`${SERVER_URL}/api/quest/${questId}/reward-tx`);
    const data = await res.json();
    return data.rewards || [];
}
