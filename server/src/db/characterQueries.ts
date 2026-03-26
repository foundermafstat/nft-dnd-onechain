import { supabase } from '../db/supabase';

export interface CreateCharacterData {
    playerId: string;
    name: string;
    ancestry: string;
    class: string;
    alignment: string;
    background: string;
    stats: {
        str: number;
        dex: number;
        con: number;
        int: number;
        wis: number;
        cha: number;
    };
    hp_current: number;
    hp_max: number;
    ac: number;
    state?: any;
}

export async function createCharacter(data: CreateCharacterData) {
    const { data: result, error } = await supabase
        .from('characters')
        .insert({
            player_id: data.playerId,
            name: data.name,
            ancestry: data.ancestry,
            class: data.class,
            alignment: data.alignment,
            background: data.background,
            stats_str: data.stats.str,
            stats_dex: data.stats.dex,
            stats_con: data.stats.con,
            stats_int: data.stats.int,
            stats_wis: data.stats.wis,
            stats_cha: data.stats.cha,
            hp_current: data.hp_current,
            hp_max: data.hp_max,
            ac: data.ac,
            state: data.state || {}
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating character:', error);
        throw error;
    }

    return result;
}

export async function getCharactersByPlayerId(playerId: string) {
    const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('player_id', playerId);

    if (error) {
        console.error('Error fetching characters:', error);
        throw error;
    }

    return data;
}

export async function getCharacterById(characterId: string) {
    const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

    if (error) {
        console.error('Error fetching character by id:', error);
        throw error;
    }

    return data;
}
