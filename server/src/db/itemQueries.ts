import { supabase } from './supabase';

export interface ItemData {
    id?: string;
    name: string;
    base_type: string;
    category: string;
    subcategory?: string;
    rarity: string;
    is_nft?: boolean;
    blockchain_status?: string;
    onechain_token_id?: string;
    cost_gp: number;
    slots: number;
    stats: Record<string, any>;
    bonuses: Record<string, any>;
    perks: any[];
    lore?: string;
    class_restrictions: string[];
    is_template: boolean;
    parent_template_id?: string;
    metadata?: Record<string, any>;
}

// ── Template items (seed catalog) ──────────────────────────────────

export async function seedItems(items: ItemData[]): Promise<boolean> {
    const { error } = await supabase
        .from('items')
        .upsert(items, { onConflict: 'id' });
    if (error) {
        console.error('Error seeding items:', error);
        return false;
    }
    return true;
}

export async function getAllTemplateItems(): Promise<ItemData[]> {
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('is_template', true)
        .order('category')
        .order('name');
    if (error) {
        console.error('Error fetching items:', error);
        return [];
    }
    return data || [];
}

export async function getItemsByCategory(category: string): Promise<ItemData[]> {
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('category', category)
        .eq('is_template', true);
    if (error) {
        console.error('Error fetching items by category:', error);
        return [];
    }
    return data || [];
}

export async function getItemById(itemId: string): Promise<ItemData | null> {
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .single();
    if (error) {
        console.error('Error fetching item:', error);
        return null;
    }
    return data;
}

// ── Player item instances ──────────────────────────────────────────

/**
 * Create a player-owned instance of a template item.
 * Copies the template and links back via parent_template_id.
 */
export async function createItemInstance(
    templateId: string,
    overrides?: Partial<ItemData>,
): Promise<string | null> {
    const template = await getItemById(templateId);
    if (!template) return null;

    const instance: any = {
        name: template.name,
        base_type: template.base_type,
        category: template.category,
        subcategory: template.subcategory,
        rarity: overrides?.rarity || template.rarity,
        cost_gp: template.cost_gp,
        slots: template.slots,
        stats: { ...template.stats, ...(overrides?.stats || {}) },
        bonuses: { ...template.bonuses, ...(overrides?.bonuses || {}) },
        perks: overrides?.perks || template.perks,
        lore: overrides?.lore || template.lore,
        class_restrictions: template.class_restrictions,
        is_template: false,
        parent_template_id: template.id,
        metadata: { ...template.metadata, ...(overrides?.metadata || {}) },
    };

    if (overrides?.name) instance.name = overrides.name;

    const { data, error } = await supabase
        .from('items')
        .insert(instance)
        .select('id')
        .single();
    if (error) {
        console.error('Error creating item instance:', error);
        return null;
    }
    return data.id;
}

/**
 * Create a fully custom item instance (not based on a template).
 * Useful for AI-generated NFT loot tied to a specific quest context.
 */
export async function createCustomItemInstance(
    input: Omit<ItemData, 'id' | 'is_template'> & { is_template?: boolean },
): Promise<string | null> {
    const payload: any = {
        name: input.name,
        base_type: input.base_type,
        category: input.category,
        subcategory: input.subcategory,
        rarity: input.rarity,
        is_nft: input.is_nft ?? false,
        blockchain_status: input.blockchain_status ?? 'OFF_CHAIN',
        onechain_token_id: input.onechain_token_id,
        cost_gp: input.cost_gp ?? 0,
        slots: input.slots ?? 1,
        stats: input.stats ?? {},
        bonuses: input.bonuses ?? {},
        perks: input.perks ?? [],
        lore: input.lore,
        class_restrictions: input.class_restrictions ?? [],
        is_template: false,
        parent_template_id: input.parent_template_id,
        metadata: input.metadata ?? {},
    };

    const { data, error } = await supabase
        .from('items')
        .insert(payload)
        .select('id')
        .single();

    if (error) {
        console.error('Error creating custom item instance:', error);
        return null;
    }

    return data.id;
}

// ── Character inventory ────────────────────────────────────────────

export async function addItemToInventory(
    characterId: string,
    itemId: string,
    quantity: number = 1,
    slotPosition: string = 'backpack',
): Promise<boolean> {
    const { error } = await supabase
        .from('character_inventory')
        .insert({
            character_id: characterId,
            item_id: itemId,
            quantity,
            slot_position: slotPosition,
            is_equipped: slotPosition !== 'backpack',
        });
    if (error) {
        console.error('Error adding item to inventory:', error);
        return false;
    }
    return true;
}

export async function getCharacterInventory(characterId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('character_inventory')
        .select(`
            id,
            quantity,
            is_equipped,
            slot_position,
            acquired_at,
            items:item_id (
                id, name, base_type, category, subcategory, rarity,
                cost_gp, slots, stats, bonuses, perks, lore, metadata,
                is_nft, blockchain_status, onechain_token_id
            )
        `)
        .eq('character_id', characterId);
    if (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
    return data || [];
}

export async function removeItemFromInventory(inventoryEntryId: string): Promise<boolean> {
    const { error } = await supabase
        .from('character_inventory')
        .delete()
        .eq('id', inventoryEntryId);
    if (error) {
        console.error('Error removing item:', error);
        return false;
    }
    return true;
}

export async function equipItem(inventoryEntryId: string, slotPosition: string): Promise<boolean> {
    const { error } = await supabase
        .from('character_inventory')
        .update({ is_equipped: true, slot_position: slotPosition })
        .eq('id', inventoryEntryId);
    if (error) {
        console.error('Error equipping item:', error);
        return false;
    }
    return true;
}

export async function unequipItem(inventoryEntryId: string): Promise<boolean> {
    const { error } = await supabase
        .from('character_inventory')
        .update({ is_equipped: false, slot_position: 'backpack' })
        .eq('id', inventoryEntryId);
    if (error) {
        console.error('Error unequipping item:', error);
        return false;
    }
    return true;
}
export async function updateItemBlockchainInfo(
    itemId: string,
    onechainTokenId: string,
    blockchainStatus: string = 'MINTED',
): Promise<boolean> {
    const { error } = await supabase
        .from('items')
        .update({
            onechain_token_id: onechainTokenId,
            blockchain_status: blockchainStatus,
            is_nft: true,
        })
        .eq('id', itemId);

    if (error) {
        console.error('Error updating item blockchain info:', error);
        return false;
    }
    return true;
}
