import { supabase } from './supabase';

export interface NpcTraits {
    [key: string]: boolean | string | string[];
}

export interface NpcBackstoryEntry {
    chapter: string;
    text: string;
}

export interface NpcKnowledgeEntry {
    topic: string;
    content: string;
}

export interface NpcMemoryEntry {
    player_id: string;
    summary: string;
    timestamp: string;
}

export interface NpcMetadata {
    appearance?: string;
    voice?: string;
    greeting?: string;
    [key: string]: any;
}

export interface NpcData {
    id?: string;
    name: string;
    title?: string;
    location_id: string;
    tile_x: number;
    tile_y: number;
    sprite_color?: string;
    traits?: NpcTraits;
    backstory?: NpcBackstoryEntry[];
    knowledge?: NpcKnowledgeEntry[];
    memory?: NpcMemoryEntry[];
    metadata?: NpcMetadata;
}

export async function getNpcsByLocation(locationId: string): Promise<NpcData[]> {
    const { data, error } = await supabase
        .from('npcs')
        .select('*')
        .eq('location_id', locationId);
    if (error) {
        console.error('Error fetching NPCs:', error);
        return [];
    }
    return data || [];
}

export async function getNpcById(npcId: string): Promise<NpcData | null> {
    const { data, error } = await supabase
        .from('npcs')
        .select('*')
        .eq('id', npcId)
        .single();
    if (error) {
        console.error('Error fetching NPC:', error);
        return null;
    }
    return data;
}

export async function seedNpcs(npcs: NpcData[]): Promise<boolean> {
    const { error } = await supabase
        .from('npcs')
        .upsert(npcs, { onConflict: 'id' });
    if (error) {
        console.error('Error seeding NPCs:', error);
        return false;
    }
    return true;
}

/**
 * Append a new knowledge entry to an NPC's knowledge array.
 */
export async function addNpcKnowledge(npcId: string, topic: string, content: string): Promise<boolean> {
    // Fetch current, append, save
    const npc = await getNpcById(npcId);
    if (!npc) return false;
    const knowledge = Array.isArray(npc.knowledge) ? npc.knowledge : [];
    knowledge.push({ topic, content });
    const { error } = await supabase
        .from('npcs')
        .update({ knowledge, updated_at: new Date().toISOString() })
        .eq('id', npcId);
    if (error) {
        console.error('Error adding NPC knowledge:', error);
        return false;
    }
    return true;
}

/**
 * Append a memory entry recording a player interaction.
 */
export async function addNpcMemory(npcId: string, playerId: string, summary: string): Promise<boolean> {
    const npc = await getNpcById(npcId);
    if (!npc) return false;
    const memory = Array.isArray(npc.memory) ? npc.memory : [];
    memory.push({ player_id: playerId, summary, timestamp: new Date().toISOString() });
    // Keep last 50 memories
    const trimmed = memory.slice(-50);
    const { error } = await supabase
        .from('npcs')
        .update({ memory: trimmed, updated_at: new Date().toISOString() })
        .eq('id', npcId);
    if (error) {
        console.error('Error adding NPC memory:', error);
        return false;
    }
    return true;
}

/**
 * Update a specific trait on an NPC.
 */
export async function updateNpcTrait(npcId: string, key: string, value: any): Promise<boolean> {
    const npc = await getNpcById(npcId);
    if (!npc) return false;
    const traits = typeof npc.traits === 'object' && npc.traits ? npc.traits : {};
    traits[key] = value;
    const { error } = await supabase
        .from('npcs')
        .update({ traits, updated_at: new Date().toISOString() })
        .eq('id', npcId);
    if (error) {
        console.error('Error updating NPC trait:', error);
        return false;
    }
    return true;
}
