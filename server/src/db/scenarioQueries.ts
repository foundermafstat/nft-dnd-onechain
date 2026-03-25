import { supabase } from './supabase';
import { ChronicleEntry, GeneratedScenario, PartyContext } from 'shared';

export async function insertChronicle(entry: Omit<ChronicleEntry, 'id' | 'created_at'>): Promise<ChronicleEntry | null> {
    const { data, error } = await supabase
        .from('campaign_chronicles')
        .insert({
            session_id: entry.session_id,
            location_id: entry.location_id,
            quest_id: entry.quest_id,
            event_type: entry.event_type,
            narrative: entry.narrative,
            on_chain_hash: entry.on_chain_hash
        })
        .select()
        .single();

    if (error) {
        console.error('Error inserting chronicle:', error);
        return null;
    }
    return data as ChronicleEntry;
}

export async function getRecentChronicles(limit: number = 5, sessionId?: string): Promise<ChronicleEntry[]> {
    let query = supabase
        .from('campaign_chronicles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (sessionId) {
        query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching recent chronicles:', error);
        return [];
    }
    return data as ChronicleEntry[];
}

export async function saveGeneratedScenario(
    locationId: string | undefined,
    context: PartyContext,
    output: GeneratedScenario
): Promise<string | null> {
    const { data, error } = await supabase
        .from('generated_scenarios')
        .insert({
            location_id: locationId,
            prompt_context: context,
            llm_output: output,
            applied: false
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error saving generated scenario:', error);
        return null;
    }
    return data.id;
}

export async function markScenarioApplied(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('generated_scenarios')
        .update({ applied: true })
        .eq('id', id);

    if (error) {
        console.error('Error marking scenario applied:', error);
        return false;
    }
    return true;
}
