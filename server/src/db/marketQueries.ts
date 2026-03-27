import { supabase } from './supabase';

export type MarketListingType = 'sale' | 'rental';
export type MarketListingStatus = 'ACTIVE' | 'SOLD' | 'RENTED' | 'CANCELLED';

export interface CreateMarketListingInput {
  type: MarketListingType;
  itemId: string;
  inventoryEntryId: string;
  characterId: string;
  heroName: string;
  heroClass?: string;
  heroAncestry?: string;
  heroLevel?: number;
  heroAlignment?: string;
  sellerPlayerId?: string | null;
  sellerWalletAddress: string;
  listingObjectId?: string | null;
  itemObjectId?: string | null;
  title: string;
  category?: string | null;
  rarity?: string | null;
  lore?: string | null;
  imageUrl?: string | null;
  metadata?: Record<string, any>;
  salePriceOne?: number | null;
  rentPriceOne?: number | null;
  collateralOne?: number | null;
  durationMs?: number | null;
}

export interface MarketListingRecord {
  id: string;
  type: MarketListingType;
  status: MarketListingStatus;
  item_id: string;
  inventory_entry_id: string;
  character_id: string;
  hero_name: string;
  hero_class: string | null;
  hero_ancestry: string | null;
  hero_level: number | null;
  hero_alignment: string | null;
  seller_player_id: string | null;
  seller_wallet_address: string;
  renter_wallet_address: string | null;
  buyer_wallet_address: string | null;
  listing_object_id: string | null;
  item_object_id: string | null;
  title: string;
  category: string | null;
  rarity: string | null;
  lore: string | null;
  image_url: string | null;
  sale_price_one: number | null;
  rent_price_one: number | null;
  collateral_one: number | null;
  duration_ms: number | null;
  tx_hash_list: string | null;
  tx_hash_close: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

function normalizeWallet(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeUrl(value: string | null | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${raw.replace('ipfs://', '')}`;
  }
  return raw;
}

export async function createMarketListing(input: CreateMarketListingInput): Promise<MarketListingRecord | null> {
  const payload = {
    type: input.type,
    status: 'ACTIVE',
    item_id: input.itemId,
    inventory_entry_id: input.inventoryEntryId,
    character_id: input.characterId,
    hero_name: input.heroName,
    hero_class: input.heroClass || null,
    hero_ancestry: input.heroAncestry || null,
    hero_level: Number.isFinite(input.heroLevel) ? Number(input.heroLevel) : null,
    hero_alignment: input.heroAlignment || null,
    seller_player_id: input.sellerPlayerId || null,
    seller_wallet_address: normalizeWallet(input.sellerWalletAddress),
    listing_object_id: input.listingObjectId || null,
    item_object_id: input.itemObjectId || null,
    title: input.title,
    category: input.category || null,
    rarity: input.rarity || null,
    lore: input.lore || null,
    image_url: normalizeUrl(input.imageUrl),
    sale_price_one: input.type === 'sale' ? Number(input.salePriceOne || 0) : null,
    rent_price_one: input.type === 'rental' ? Number(input.rentPriceOne || 0) : null,
    collateral_one: input.type === 'rental' ? Number(input.collateralOne || 0) : null,
    duration_ms: input.type === 'rental' ? Number(input.durationMs || 0) : null,
    metadata: input.metadata || {},
  };

  const { data, error } = await supabase
    .from('nft_market_listings')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('Error creating market listing:', error);
    return null;
  }

  return data as MarketListingRecord;
}

export async function getActiveMarketListings(type?: MarketListingType): Promise<MarketListingRecord[]> {
  let query = supabase
    .from('nft_market_listings')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching market listings:', error);
    return [];
  }
  return (data || []) as MarketListingRecord[];
}

export async function getMarketListingsBySellerWallet(walletAddress: string): Promise<MarketListingRecord[]> {
  const { data, error } = await supabase
    .from('nft_market_listings')
    .select('*')
    .eq('seller_wallet_address', normalizeWallet(walletAddress))
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching seller market listings:', error);
    return [];
  }

  return (data || []) as MarketListingRecord[];
}

export async function markMarketListingClosed(
  listingId: string,
  input: {
    status: Exclude<MarketListingStatus, 'ACTIVE'>;
    actorWalletAddress?: string;
    closeTxHash?: string;
  },
): Promise<boolean> {
  const patch: Record<string, any> = {
    status: input.status,
    tx_hash_close: input.closeTxHash || null,
    updated_at: new Date().toISOString(),
  };

  const actor = normalizeWallet(input.actorWalletAddress || '');
  if (actor) {
    if (input.status === 'SOLD') patch.buyer_wallet_address = actor;
    if (input.status === 'RENTED') patch.renter_wallet_address = actor;
  }

  const { error } = await supabase
    .from('nft_market_listings')
    .update(patch)
    .eq('id', listingId)
    .eq('status', 'ACTIVE');

  if (error) {
    console.error('Error closing market listing:', error);
    return false;
  }

  return true;
}

export async function settleSoldListingToBuyerWallet(
  listingId: string,
  buyerWalletAddress: string,
): Promise<boolean> {
  const buyerWallet = normalizeWallet(buyerWalletAddress);
  if (!listingId || !buyerWallet) return false;

  const { data: listing, error: listingError } = await supabase
    .from('nft_market_listings')
    .select('id, status, inventory_entry_id, item_id')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) {
    console.error('Error loading listing for settlement:', listingError);
    return false;
  }

  const { data: buyerPlayer, error: buyerPlayerError } = await supabase
    .from('players')
    .select('id')
    .ilike('wallet_address', buyerWallet)
    .limit(1)
    .maybeSingle();

  if (buyerPlayerError || !buyerPlayer?.id) {
    console.error('Error loading buyer player for settlement:', buyerPlayerError);
    return false;
  }

  const { data: buyerCharacters, error: buyerCharactersError } = await supabase
    .from('characters')
    .select('id, created_at')
    .eq('player_id', buyerPlayer.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (buyerCharactersError || !buyerCharacters?.length) {
    console.error('Error loading buyer characters for settlement:', buyerCharactersError);
    return false;
  }

  const buyerCharacterId = String(buyerCharacters[0].id || '').trim();
  if (!buyerCharacterId) return false;

  const inventoryEntryId = String((listing as any).inventory_entry_id || '').trim();
  const itemId = String((listing as any).item_id || '').trim();
  if (!itemId) return false;

  const { data: existingEntry, error: existingEntryError } = await supabase
    .from('character_inventory')
    .select('id, item_id')
    .eq('id', inventoryEntryId)
    .maybeSingle();

  if (existingEntryError) {
    console.error('Error loading inventory entry for settlement:', existingEntryError);
    return false;
  }

  if (existingEntry?.id) {
    const { error: transferError } = await supabase
      .from('character_inventory')
      .update({
        character_id: buyerCharacterId,
        slot_position: 'backpack',
        is_equipped: false,
        acquired_at: new Date().toISOString(),
      })
      .eq('id', existingEntry.id);

    if (transferError) {
      console.error('Error transferring inventory entry to buyer:', transferError);
      return false;
    }
    return true;
  }

  const { error: insertError } = await supabase
    .from('character_inventory')
    .insert({
      character_id: buyerCharacterId,
      item_id: itemId,
      quantity: 1,
      slot_position: 'backpack',
      is_equipped: false,
      acquired_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('Error inserting purchased item for buyer:', insertError);
    return false;
  }

  return true;
}
