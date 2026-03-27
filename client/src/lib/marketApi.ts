import { SERVER_URL } from './config';

export type MarketListingType = 'sale' | 'rental';
export type MarketListingStatus = 'ACTIVE' | 'SOLD' | 'RENTED' | 'CANCELLED';

export interface MarketListing {
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

async function parseJsonSafe(response: Response) {
  return response.json().catch(() => ({}));
}

export async function fetchMarketListings(type?: MarketListingType): Promise<MarketListing[]> {
  const query = type ? ('?type=' + encodeURIComponent(type)) : '';
  const response = await fetch(SERVER_URL + '/api/market/listings' + query);
  const payload = await parseJsonSafe(response);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Failed to load marketplace listings.');
  }
  return (payload.listings || []) as MarketListing[];
}

export async function fetchSellerListings(walletAddress: string): Promise<MarketListing[]> {
  const wallet = String(walletAddress || '').trim();
  if (!wallet) return [];
  const response = await fetch(SERVER_URL + '/api/market/listings/seller/' + encodeURIComponent(wallet));
  const payload = await parseJsonSafe(response);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Failed to load seller listings.');
  }
  return (payload.listings || []) as MarketListing[];
}

export async function createSaleListingRecord(input: {
  inventoryEntryId: string;
  sellerPlayerId: string;
  sellerWalletAddress: string;
  listingObjectId: string;
  itemObjectId?: string;
  salePriceOne: number;
  txHashList?: string;
}): Promise<MarketListing> {
  const response = await fetch(SERVER_URL + '/api/market/listings/sale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonSafe(response);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Failed to create sale listing.');
  }
  return payload.listing as MarketListing;
}

export async function createRentalListingRecord(input: {
  inventoryEntryId: string;
  sellerPlayerId: string;
  sellerWalletAddress: string;
  listingObjectId: string;
  itemObjectId?: string;
  rentPriceOne: number;
  collateralOne: number;
  durationMs: number;
  txHashList?: string;
}): Promise<MarketListing> {
  const response = await fetch(SERVER_URL + '/api/market/listings/rental', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonSafe(response);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Failed to create rental listing.');
  }
  return payload.listing as MarketListing;
}

export async function closeListingRecord(input: {
  listingId: string;
  status: 'SOLD' | 'RENTED' | 'CANCELLED';
  actorWalletAddress?: string;
  closeTxHash?: string;
}): Promise<void> {
  const response = await fetch(
    SERVER_URL + '/api/market/listings/' + encodeURIComponent(input.listingId) + '/close',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  );
  const payload = await parseJsonSafe(response);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Failed to close listing.');
  }
}
