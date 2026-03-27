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
        cost_gp: overrides?.cost_gp ?? template.cost_gp,
        slots: overrides?.slots ?? template.slots,
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

export interface QuestRewardTxInfo {
    item_id: string;
    item_name: string;
    tx_hash: string;
    onechain_token_id: string | null;
    metadata_cid?: string;
    lore_cid?: string;
    image_url?: string;
    hero?: {
        character_id?: string;
        hero_name?: string;
        hero_class?: string;
        hero_ancestry?: string;
        level?: number;
        alignment?: string;
        sbt?: Record<string, any> | null;
    };
    created_at?: string;
}

function normalizeAssetUrl(value: string): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('ipfs://')) {
        return `https://ipfs.io/ipfs/${raw.replace('ipfs://', '')}`;
    }
    return raw;
}

export async function getQuestGeneratedItemSignals(questId: string): Promise<{
    names: string[];
    categories: string[];
}> {
    const normalizedQuestId = String(questId || '').trim();
    if (!normalizedQuestId) {
        return { names: [], categories: [] };
    }

    const { data, error } = await supabase
        .from('items')
        .select('name, category')
        .eq('is_nft', true)
        .eq('metadata->>quest_id', normalizedQuestId)
        .limit(128);

    if (error) {
        console.error('Error fetching quest generated item signals:', error);
        return { names: [], categories: [] };
    }

    const names = new Set<string>();
    const categories = new Set<string>();

    for (const row of (data || []) as Array<{ name?: string; category?: string }>) {
        if (row?.name) names.add(String(row.name).trim());
        if (row?.category) categories.add(String(row.category).trim());
    }

    return {
        names: Array.from(names).filter(Boolean),
        categories: Array.from(categories).filter(Boolean),
    };
}

export async function getQuestRewardTransactions(questId: string): Promise<QuestRewardTxInfo[]> {
    const normalizedQuestId = String(questId || '').trim();
    if (!normalizedQuestId) return [];

    const { data, error } = await supabase
        .from('items')
        .select('id, name, onechain_token_id, metadata')
        .eq('is_nft', true)
        .limit(500);

    if (error) {
        console.error('Error fetching quest reward transactions:', error);
        return [];
    }

    const rows = (data || []) as Array<{
        id: string;
        name: string;
        onechain_token_id?: string | null;
        metadata?: Record<string, any> | null;
    }>;

    return rows
        .map((row) => {
            const metadata = (row.metadata && typeof row.metadata === 'object') ? row.metadata : {};
            const metadataCid = String(metadata.metadataCid || metadata.cid || metadata.ipfs_metadata_cid || '');
            const loreCid = String(metadata.loreCid || metadata.ipfs_lore_cid || '');
            const txHash = String(metadata.txHash || '').trim();
            const imageUrl = normalizeAssetUrl(String(
                metadata.image ||
                metadata.imageUrl ||
                metadata.nftImage ||
                metadata.nftImageUrl ||
                metadata.ipfs_image_url ||
                metadata.media?.image ||
                '',
            ).trim());
            const metadataQuestId = String(metadata.quest_id || metadata.questId || '').trim();

            const belongsToQuest =
                metadataQuestId === normalizedQuestId ||
                metadataCid.includes(normalizedQuestId) ||
                loreCid.includes(normalizedQuestId);

            if (!belongsToQuest || !txHash) return null;

            return {
                item_id: row.id,
                item_name: row.name,
                tx_hash: txHash,
                onechain_token_id: row.onechain_token_id || null,
                metadata_cid: metadataCid || undefined,
                lore_cid: loreCid || undefined,
                image_url: imageUrl || undefined,
                hero: {
                    character_id: String(metadata.character_id || metadata.characterId || '').trim() || undefined,
                    hero_name: String(metadata.hero_name || metadata.heroName || '').trim() || undefined,
                    hero_class: String(metadata.hero_class || metadata.heroClass || '').trim() || undefined,
                    hero_ancestry: String(metadata.hero_ancestry || metadata.heroAncestry || '').trim() || undefined,
                    level: Number.isFinite(Number(metadata.hero_level || metadata.heroLevel))
                        ? Number(metadata.hero_level || metadata.heroLevel)
                        : undefined,
                    alignment: String(metadata.hero_alignment || metadata.heroAlignment || '').trim() || undefined,
                    sbt:
                        metadata.hero_sbt_snapshot && typeof metadata.hero_sbt_snapshot === 'object'
                            ? metadata.hero_sbt_snapshot
                            : (
                                metadata.heroSbtSnapshot && typeof metadata.heroSbtSnapshot === 'object'
                                    ? metadata.heroSbtSnapshot
                                    : null
                            ),
                },
                created_at: String(metadata.generated_at || metadata.created_at || '').trim() || undefined,
            } satisfies QuestRewardTxInfo;
        })
        .filter(Boolean) as QuestRewardTxInfo[];
}
