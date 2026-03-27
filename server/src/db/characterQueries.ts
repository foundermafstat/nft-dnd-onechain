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

export interface CharacterQuestProgressDelta {
    xpDelta: number;
    loreScoreDelta: number;
    levelDelta: number;
}

export async function applyQuestProgressToCharacter(
    characterId: string,
    delta: CharacterQuestProgressDelta,
) {
    const character = await getCharacterById(characterId);
    if (!character) {
        throw new Error('Character not found');
    }

    const currentXp = Number(character.xp || 0);
    const currentLevel = Number(character.level || 1);
    const currentState = (character.state && typeof character.state === 'object')
        ? character.state
        : {};
    const currentOnchain = (currentState.onchain && typeof currentState.onchain === 'object')
        ? currentState.onchain
        : {};
    const currentSnapshot = (currentOnchain.heroSbtSnapshot && typeof currentOnchain.heroSbtSnapshot === 'object')
        ? currentOnchain.heroSbtSnapshot
        : null;

    const nextXp = currentXp + Math.max(0, Math.floor(delta.xpDelta));
    const nextLevel = currentLevel + Math.max(0, Math.floor(delta.levelDelta));

    const nextState = {
        ...currentState,
        progression: {
            ...((currentState.progression && typeof currentState.progression === 'object') ? currentState.progression : {}),
            xp: nextXp,
            level: nextLevel,
            updatedAt: new Date().toISOString(),
        },
        onchain: {
            ...currentOnchain,
            heroSbtSnapshot: currentSnapshot
                ? {
                    ...currentSnapshot,
                    xp: nextXp,
                    level: nextLevel,
                    loreScore: Number(currentSnapshot.loreScore || 0) + Math.max(0, Math.floor(delta.loreScoreDelta)),
                }
                : undefined,
            pendingProgressSync: {
                xpDelta: Math.max(0, Math.floor(delta.xpDelta)),
                loreScoreDelta: Math.max(0, Math.floor(delta.loreScoreDelta)),
                levelDelta: Math.max(0, Math.floor(delta.levelDelta)),
                status: 'PENDING_RELAYER',
                updatedAt: new Date().toISOString(),
            },
        },
    };

    const { data, error } = await supabase
        .from('characters')
        .update({
            xp: nextXp,
            level: nextLevel,
            state: nextState,
            updated_at: new Date().toISOString(),
        })
        .eq('id', characterId)
        .select('*')
        .single();

    if (error) {
        console.error('Error applying quest progress to character:', error);
        throw error;
    }

    return {
        previous: {
            xp: currentXp,
            level: currentLevel,
        },
        next: {
            xp: Number(data?.xp || nextXp),
            level: Number(data?.level || nextLevel),
        },
        character: data,
    };
}
