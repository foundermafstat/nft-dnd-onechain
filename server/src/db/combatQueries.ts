import { supabase } from './supabase';
import { CombatState, CombatEntity, CombatLog } from 'shared';

/**
 * Creates a new combat record in the database.
 */
export async function createCombat(
    locationId: string,
    entities: Record<string, CombatEntity>,
    turnQueue: string[],
    activeEntityId: string
): Promise<string | null> {
    const { data, error } = await supabase
        .from('combats')
        .insert({
            location_id: locationId,
            status: 'IN_PROGRESS',
            round: 1,
            turn_queue: turnQueue,
            current_turn_index: 0,
            active_entity_id: activeEntityId,
            entities,
            logs: [],
        })
        .select('id')
        .single();

    if (error) {
        console.error('Failed to create combat:', error);
        return null;
    }
    return data.id;
}

/**
 * Registers a participant in a combat.
 */
export async function addCombatParticipant(
    combatId: string,
    entityId: string,
    entityType: 'PLAYER' | 'MOB',
    initiative: number,
    characterId?: string
): Promise<boolean> {
    const { error } = await supabase
        .from('combat_participants')
        .insert({
            combat_id: combatId,
            entity_id: entityId,
            entity_type: entityType,
            character_id: characterId || null,
            initiative,
        });

    if (error) {
        console.error('Failed to add combat participant:', error);
        return false;
    }
    return true;
}

/**
 * Gets the full combat state by ID.
 */
export async function getCombat(combatId: string): Promise<CombatState | null> {
    const { data, error } = await supabase
        .from('combats')
        .select('*')
        .eq('id', combatId)
        .single();

    if (error || !data) return null;

    return {
        combatId: data.id,
        locationId: data.location_id,
        status: data.status,
        round: data.round,
        turnQueue: data.turn_queue,
        currentTurnIndex: data.current_turn_index,
        activeEntityId: data.active_entity_id,
        entities: data.entities,
        logs: data.logs,
    };
}

/**
 * Updates the full combat state in the database.
 */
export async function updateCombatState(combatId: string, state: Partial<CombatState>): Promise<boolean> {
    const updatePayload: Record<string, any> = {};

    if (state.status !== undefined) updatePayload.status = state.status;
    if (state.round !== undefined) updatePayload.round = state.round;
    if (state.turnQueue !== undefined) updatePayload.turn_queue = state.turnQueue;
    if (state.currentTurnIndex !== undefined) updatePayload.current_turn_index = state.currentTurnIndex;
    if (state.activeEntityId !== undefined) updatePayload.active_entity_id = state.activeEntityId;
    if (state.entities !== undefined) updatePayload.entities = state.entities;
    if (state.logs !== undefined) updatePayload.logs = state.logs;

    if (state.status === 'VICTORY' || state.status === 'DEFEAT') {
        updatePayload.finished_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('combats')
        .update(updatePayload)
        .eq('id', combatId);

    if (error) {
        console.error('Failed to update combat state:', error);
        return false;
    }
    return true;
}

/**
 * Finds an active combat at a given location.
 */
export async function getActiveCombatByLocation(locationId: string): Promise<CombatState | null> {
    const { data, error } = await supabase
        .from('combats')
        .select('*')
        .eq('location_id', locationId)
        .in('status', ['INITIATIVE', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) return null;

    return {
        combatId: data.id,
        locationId: data.location_id,
        status: data.status,
        round: data.round,
        turnQueue: data.turn_queue,
        currentTurnIndex: data.current_turn_index,
        activeEntityId: data.active_entity_id,
        entities: data.entities,
        logs: data.logs,
    };
}
