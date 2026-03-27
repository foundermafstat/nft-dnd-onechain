import { supabase } from './supabase';
import type { MartaQuestFlow, QuestState } from 'shared';

export interface QuestLocation {
    id?: string;
    name: string;
    biome_type: string;
    room_type: string;
    threat_level: number;
    coordinates?: any;
}

export interface QuestHistoryEntry {
    quest_id: string;
    location_id?: string;
    player_action?: string;
    player_background?: string;
    player_roll?: number;
    dm_roll?: number;
    ai_narrative?: string;
    engine_trigger?: string;
    on_chain_event?: boolean;
    movement_vector?: any;
}

export async function createQuest(partyMembers: string[] = []): Promise<string | null> {
    const { data, error } = await supabase
        .from('quests')
        .insert([{ party_members: partyMembers }])
        .select('id')
        .single();
    if (error) {
        console.error('Error creating quest:', error);
        return null;
    }
    return data.id;
}

export async function createQuestWithFlow(
    partyMembers: string[] = [],
    flow: MartaQuestFlow,
): Promise<string | null> {
    const { data, error } = await supabase
        .from('quests')
        .insert([{
            party_members: partyMembers,
            status: 'InProgress',
            stat_changes: {
                flow,
                timeline: [
                    { at: new Date().toISOString(), state: flow.state, reason: 'created' },
                ],
            },
        }])
        .select('id')
        .single();
    if (error) {
        console.error('Error creating quest with flow:', error);
        return null;
    }
    return data.id;
}

export async function finishQuest(questId: string, status: 'Success' | 'PartyWiped', lootDropped: boolean, statChanges: any = {}): Promise<boolean> {
    const { error } = await supabase
        .from('quests')
        .update({
            status,
            end_time: new Date().toISOString(),
            loot_dropped: lootDropped,
            stat_changes: statChanges,
            updated_at: new Date().toISOString()
        })
        .eq('id', questId);
    if (error) {
        console.error('Error finishing quest:', error);
        return false;
    }
    return true;
}

export async function insertQuestHistory(entry: QuestHistoryEntry): Promise<string | null> {
    const { data, error } = await supabase
        .from('quest_history')
        .insert([entry])
        .select('id')
        .single();
    if (error) {
        console.error('Error inserting quest history:', error);
        return null;
    }
    return data.id;
}

export async function getLastSuccessfulProgression(questId: string): Promise<Date | null> {
    const { data, error } = await supabase
        .from('quest_history')
        .select('created_at')
        .eq('quest_id', questId)
        .neq('engine_trigger', 'spawn_patrol')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) return null;
    return new Date(data.created_at);
}

export async function getAllQuests(): Promise<any[]> {
    const { data, error } = await supabase
        .from('quests')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching quests:', error);
        return [];
    }
    return data || [];
}

export async function getQuestById(questId: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('id', questId)
        .single();
    if (error) {
        console.error('Error fetching quest:', error);
        return null;
    }
    return data;
}

export async function getLatestInProgressQuestForPlayer(playerId: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('status', 'InProgress')
        .order('created_at', { ascending: false })
        .limit(20);
    if (error) {
        console.error('Error fetching in-progress quests:', error);
        return null;
    }
    const matched = (data || []).find((row: any) =>
        Array.isArray(row.party_members) && row.party_members.includes(playerId),
    );
    return matched || null;
}

export async function updateQuestFlowState(
    questId: string,
    input: {
        state: QuestState;
        branch?: 'pending' | 'success' | 'fail';
        combatOutcome?: 'success' | 'fail' | null;
        sessionId?: number | null;
        rewardResolution?: MartaQuestFlow['rewardResolution'];
        rewardDraft?: MartaQuestFlow['rewardDraft'];
        metadata?: Record<string, unknown>;
        timelineReason: string;
    },
): Promise<boolean> {
    const quest = await getQuestById(questId);
    if (!quest) return false;

    const statChanges = (quest.stat_changes && typeof quest.stat_changes === 'object') ? quest.stat_changes : {};
    const flow = (statChanges.flow && typeof statChanges.flow === 'object') ? statChanges.flow : {};
    const timeline = Array.isArray(statChanges.timeline) ? statChanges.timeline : [];

    const nextFlow = {
        ...flow,
        state: input.state,
        branch: input.branch ?? flow.branch ?? 'pending',
        combatOutcome: input.combatOutcome !== undefined ? input.combatOutcome : (flow.combatOutcome ?? null),
        sessionId: input.sessionId !== undefined ? input.sessionId : (flow.sessionId ?? null),
        rewardResolution: input.rewardResolution !== undefined ? input.rewardResolution : (flow.rewardResolution ?? null),
        rewardDraft: input.rewardDraft !== undefined ? input.rewardDraft : (flow.rewardDraft ?? null),
        updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
        .from('quests')
        .update({
            stat_changes: {
                ...statChanges,
                ...input.metadata,
                flow: nextFlow,
                timeline: [
                    ...timeline,
                    { at: new Date().toISOString(), state: input.state, reason: input.timelineReason },
                ],
            },
            updated_at: new Date().toISOString(),
        })
        .eq('id', questId);

    if (error) {
        console.error('Error updating quest flow state:', error);
        return false;
    }

    return true;
}

export async function getQuestHistory(questId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('quest_history')
        .select('*')
        .eq('quest_id', questId)
        .order('created_at', { ascending: true });
    if (error) {
        console.error('Error fetching quest history:', error);
        return [];
    }
    return data || [];
}

export async function createLocation(location: QuestLocation): Promise<string | null> {
    const { data, error } = await supabase
        .from('locations')
        .insert([location])
        .select('id')
        .single();
    if (error) {
        console.error('Error creating location:', error);
        return null;
    }
    return data.id;
}

export async function seedLocations(locations: Array<{ id: string; name: string; biome_type: string; room_type: string; threat_level: number; coordinates: any }>): Promise<boolean> {
    // Upsert so re-running seed is safe
    const { error } = await supabase
        .from('locations')
        .upsert(locations, { onConflict: 'id' });
    if (error) {
        console.error('Error seeding locations:', error);
        return false;
    }
    return true;
}

export async function getAllLocations(): Promise<any[]> {
    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) {
        console.error('Error fetching locations:', error);
        return [];
    }
    return data || [];
}

export async function getLocationById(locationId: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', locationId)
        .single();
    if (error) {
        console.error('Error fetching location:', error);
        return null;
    }
    return data;
}

// === PLAYER POSITIONS ===

export async function upsertPlayerPosition(playerId: string, locationId: string, tileX: number, tileY: number): Promise<boolean> {
    const { error } = await supabase
        .from('player_positions')
        .upsert({
            player_id: playerId,
            location_id: locationId,
            tile_x: tileX,
            tile_y: tileY,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'player_id' });
    if (error) {
        console.error('Error upserting player position:', error);
        return false;
    }
    return true;
}

export async function getPlayerPosition(playerId: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('player_positions')
        .select('*')
        .eq('player_id', playerId)
        .single();
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error fetching player position:', error);
    }
    return data || null;
}

export async function getPlayersInLocation(locationId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('player_positions')
        .select('player_id, tile_x, tile_y, updated_at')
        .eq('location_id', locationId);
    if (error) {
        console.error('Error fetching players in location:', error);
        return [];
    }
    return data || [];
}
