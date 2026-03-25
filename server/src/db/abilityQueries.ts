import { supabase } from './supabase';

export interface AbilityData {
    id?: string;
    name: string;
    slug: string;
    description: string;
    ability_type: string;
    tier: number;
    class_restriction: string[];
    ancestry_restriction: string[];
    level_requirement: number;
    primary_stat: string | null;
    mechanics: Record<string, any>;
    usage: Record<string, any>;
    source: string;
    is_template: boolean;
    metadata?: Record<string, any>;
}

// ── Seed / Template queries ────────────────────────────────────────

export async function seedAbilities(abilities: AbilityData[]): Promise<boolean> {
    const { error } = await supabase
        .from('abilities')
        .upsert(abilities, { onConflict: 'id' });
    if (error) {
        console.error('Error seeding abilities:', error);
        return false;
    }
    return true;
}

export async function getAllAbilities(): Promise<AbilityData[]> {
    const { data, error } = await supabase
        .from('abilities')
        .select('*')
        .eq('is_template', true)
        .order('ability_type')
        .order('name');
    if (error) {
        console.error('Error fetching abilities:', error);
        return [];
    }
    return data || [];
}

export async function getAbilitiesByType(abilityType: string): Promise<AbilityData[]> {
    const { data, error } = await supabase
        .from('abilities')
        .select('*')
        .eq('ability_type', abilityType)
        .eq('is_template', true);
    if (error) {
        console.error('Error fetching abilities by type:', error);
        return [];
    }
    return data || [];
}

export async function getAbilitiesForClass(heroClass: string): Promise<AbilityData[]> {
    const { data, error } = await supabase
        .from('abilities')
        .select('*')
        .eq('is_template', true)
        .or(`class_restriction.cs.{${heroClass}},class_restriction.eq.{}`);
    if (error) {
        console.error('Error fetching class abilities:', error);
        return [];
    }
    return data || [];
}

export async function getAbilitiesForAncestry(ancestry: string): Promise<AbilityData[]> {
    const { data, error } = await supabase
        .from('abilities')
        .select('*')
        .eq('is_template', true)
        .contains('ancestry_restriction', [ancestry]);
    if (error) {
        console.error('Error fetching ancestry abilities:', error);
        return [];
    }
    return data || [];
}

export async function getAbilityById(id: string): Promise<AbilityData | null> {
    const { data, error } = await supabase
        .from('abilities')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error('Error fetching ability:', error);
        return null;
    }
    return data;
}

export async function getAbilityBySlug(slug: string): Promise<AbilityData | null> {
    const { data, error } = await supabase
        .from('abilities')
        .select('*')
        .eq('slug', slug)
        .single();
    if (error) {
        console.error('Error fetching ability by slug:', error);
        return null;
    }
    return data;
}

// ── Character ability management ───────────────────────────────────

export async function learnAbility(
    characterId: string,
    abilityId: string,
    source: string = 'level_up',
): Promise<boolean> {
    const { error } = await supabase
        .from('character_abilities')
        .upsert({
            character_id: characterId,
            ability_id: abilityId,
            source,
            is_active: true,
        }, { onConflict: 'character_id,ability_id' });
    if (error) {
        console.error('Error learning ability:', error);
        return false;
    }
    return true;
}

export async function getCharacterAbilities(characterId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('character_abilities')
        .select(`
            id,
            is_active,
            charges_remaining,
            source,
            acquired_at,
            abilities:ability_id (
                id, name, slug, description, ability_type, tier,
                class_restriction, ancestry_restriction, level_requirement,
                primary_stat, mechanics, usage, metadata
            )
        `)
        .eq('character_id', characterId);
    if (error) {
        console.error('Error fetching character abilities:', error);
        return [];
    }
    return data || [];
}

export async function forgetAbility(characterId: string, abilityId: string): Promise<boolean> {
    const { error } = await supabase
        .from('character_abilities')
        .delete()
        .eq('character_id', characterId)
        .eq('ability_id', abilityId);
    if (error) {
        console.error('Error forgetting ability:', error);
        return false;
    }
    return true;
}
