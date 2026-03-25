import { supabase } from '../db/supabase';
import { parseDice } from 'shared';

const POOL_SIZE = 200; // Pre-generate 200 values per entity per combat

/**
 * Creates a new Fate Pool for an entity in a combat session.
 * Generates an array of random integers (1–100) that will be mapped
 * to specific die sizes at consumption time.
 */
export async function createFatePool(combatId: string, entityId: string): Promise<string | null> {
    const values: number[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
        values.push(Math.floor(Math.random() * 100) + 1); // 1–100
    }

    const { data, error } = await supabase
        .from('fate_pools')
        .insert({
            combat_id: combatId,
            entity_id: entityId,
            current_index: 0,
            pool_values: values,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Failed to create fate pool:', error);
        return null;
    }
    return data.id;
}

/**
 * Consumes the next value from a Fate Pool and maps it to a specific die type.
 * For a d20: value = (raw % 20) + 1
 * For a d6:  value = (raw % 6) + 1
 *
 * Returns { raw, mapped, index } or null if pool exhausted.
 */
export async function rollFromPool(
    combatId: string,
    entityId: string,
    dieType: number
): Promise<{ raw: number; mapped: number; index: number } | null> {
    // Fetch pool
    const { data: pool, error } = await supabase
        .from('fate_pools')
        .select('id, current_index, pool_values')
        .eq('combat_id', combatId)
        .eq('entity_id', entityId)
        .single();

    if (error || !pool) {
        console.error('Fate pool not found:', error);
        return null;
    }

    const idx = pool.current_index;
    if (idx >= pool.pool_values.length) {
        console.error('Fate pool exhausted for entity', entityId);
        return null;
    }

    const raw = pool.pool_values[idx];
    const mapped = (raw % dieType) + 1;

    // Increment index atomically
    const { error: updateError } = await supabase
        .from('fate_pools')
        .update({ current_index: idx + 1 })
        .eq('id', pool.id)
        .eq('current_index', idx); // Optimistic concurrency check

    if (updateError) {
        console.error('Failed to increment fate pool index:', updateError);
        return null;
    }

    return { raw, mapped, index: idx };
}

/**
 * Rolls dice using Fate Pool. Parses '1d6', '2d8+2' etc.
 * Returns the total and individual DiceResults.
 */
export async function rollDice(
    combatId: string,
    entityId: string,
    diceStr: string
): Promise<{ total: number; rolls: number[] } | null> {
    const { count, sides, bonus } = parseDice(diceStr);
    const rolls: number[] = [];
    let total = bonus;

    for (let i = 0; i < count; i++) {
        const result = await rollFromPool(combatId, entityId, sides);
        if (!result) return null;
        rolls.push(result.mapped);
        total += result.mapped;
    }

    return { total, rolls };
}
