'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, Gem, Loader2, Search, ShieldCheck, ShoppingCart, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useOnechainWalletExecutor } from '@/hooks/useOnechainWalletExecutor';
import { buySaleListing, startRental } from '@/lib/OneChain';
import { closeListingRecord, fetchMarketListings, type MarketListing } from '@/lib/marketApi';

type MarketTab = 'sale' | 'rental';

function normalizeImage(url: string | null | undefined): string {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (raw.startsWith('ipfs://')) {
    return 'https://ipfs.io/ipfs/' + raw.replace('ipfs://', '');
  }
  return raw;
}

export default function MarketplacePage() {
  const { walletAddress } = useAuth();
  const { executor, isExecuting: isWalletExecuting } = useOnechainWalletExecutor();

  const [tab, setTab] = useState<MarketTab>('sale');
  const [query, setQuery] = useState('');
  const [saleListings, setSaleListings] = useState<MarketListing[]>([]);
  const [rentalListings, setRentalListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyByListing, setBusyByListing] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshListings = async () => {
    const [sales, rentals] = await Promise.all([fetchMarketListings('sale'), fetchMarketListings('rental')]);
    setSaleListings(sales.filter((row) => row.status === 'ACTIVE'));
    setRentalListings(rentals.filter((row) => row.status === 'ACTIVE'));
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await refreshListings();
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load marketplace offers.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visibleSales = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return saleListings;
    return saleListings.filter((row) =>
      [row.title, row.lore, row.hero_name, row.hero_class, row.hero_ancestry]
        .map((v) => String(v || '').toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [query, saleListings]);

  const visibleRentals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rentalListings;
    return rentalListings.filter((row) =>
      [row.title, row.lore, row.hero_name, row.hero_class, row.hero_ancestry]
        .map((v) => String(v || '').toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [query, rentalListings]);

  const setListingBusy = (listingId: string, busy: boolean) => {
    setBusyByListing((prev) => ({ ...prev, [listingId]: busy }));
  };

  const handleBuy = async (listing: MarketListing) => {
    setMessage(null);
    setError(null);
    if (!walletAddress || !executor) {
      setError('Connect OneWallet to buy NFT listings.');
      return;
    }
    const listingObjectId = String(listing.listing_object_id || '').trim();
    const salePrice = Number(listing.sale_price_one || 0);
    if (!listingObjectId || salePrice <= 0) {
      setError('Listing is missing on-chain object id or valid sale price.');
      return;
    }

    setListingBusy(listing.id, true);
    try {
      const result = await buySaleListing(
        {
          buyerAddress: walletAddress,
          saleListingObjectId: listingObjectId,
          priceOne: salePrice,
        },
        executor,
      );

      if (!result.success) {
        throw new Error(result.error || 'Buy transaction failed.');
      }

      await closeListingRecord({
        listingId: listing.id,
        status: 'SOLD',
        actorWalletAddress: walletAddress,
        closeTxHash: result.hash,
      });

      await refreshListings();
      setMessage('Purchased ' + listing.title + '.');
    } catch (txError: any) {
      setError(txError?.message || 'Failed to buy listing.');
    } finally {
      setListingBusy(listing.id, false);
    }
  };

  const handleRent = async (listing: MarketListing) => {
    setMessage(null);
    setError(null);
    if (!walletAddress || !executor) {
      setError('Connect OneWallet to rent NFT listings.');
      return;
    }

    const listingObjectId = String(listing.listing_object_id || '').trim();
    const rentPrice = Number(listing.rent_price_one || 0);
    const collateral = Number(listing.collateral_one || 0);
    if (!listingObjectId || rentPrice <= 0 || collateral < 0) {
      setError('Listing is missing on-chain object id or valid rent/collateral values.');
      return;
    }

    setListingBusy(listing.id, true);
    try {
      const result = await startRental(
        {
          renterAddress: walletAddress,
          rentalListingObjectId: listingObjectId,
          rentPriceOne: rentPrice,
          collateralOne: collateral,
        },
        executor,
      );

      if (!result.success) {
        throw new Error(result.error || 'Rental transaction failed.');
      }

      await closeListingRecord({
        listingId: listing.id,
        status: 'RENTED',
        actorWalletAddress: walletAddress,
        closeTxHash: result.hash,
      });

      await refreshListings();
      setMessage('Rented ' + listing.title + '.');
    } catch (txError: any) {
      setError(txError?.message || 'Failed to start rental.');
    } finally {
      setListingBusy(listing.id, false);
    }
  };

  const renderListingCard = (listing: MarketListing, mode: MarketTab) => {
    const imageUrl = normalizeImage(listing.image_url);
    const isBusy = Boolean(busyByListing[listing.id]) || isWalletExecuting;

    return (
      <Card
        key={listing.id}
        className="group overflow-hidden rounded-[24px] border-white/8 bg-[linear-gradient(180deg,rgba(19,19,22,0.94),rgba(12,12,14,0.96))] py-0 shadow-[0_18px_36px_rgba(0,0,0,0.35)]"
      >
        <CardHeader className="px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <Badge variant="outline" className="rounded-full border-white/12 bg-white/[0.03] px-2.5 py-1 text-[0.62rem] tracking-[0.2em] uppercase text-stone-300">
              {listing.rarity || 'NFT'}
            </Badge>
            <Badge variant="outline" className="rounded-full border-amber-400/24 bg-amber-400/[0.08] px-2.5 py-1 text-[0.62rem] tracking-[0.2em] uppercase text-amber-100">
              {listing.category || 'Quest Item'}
            </Badge>
          </div>
          <CardTitle className="font-cinzel text-[1rem] uppercase tracking-[0.1em] text-stone-100">
            {listing.title}
          </CardTitle>
          <CardDescription className="text-[0.78rem] leading-6 text-stone-400">
            {listing.lore || 'Quest-forged NFT with on-chain provenance.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <div className="relative mb-4 flex h-56 items-center justify-center overflow-hidden rounded-[18px] border border-white/8 bg-[radial-gradient(circle_at_30%_18%,rgba(230,194,123,0.14),transparent_42%),radial-gradient(circle_at_70%_75%,rgba(87,118,157,0.14),transparent_44%),linear-gradient(180deg,rgba(17,17,20,0.96),rgba(11,11,13,0.96))]">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={listing.title}
                className="h-[110%] w-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <span className="text-[0.7rem] uppercase tracking-[0.18em] text-stone-500">No Image</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[0.72rem]">
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
              <div className="uppercase tracking-[0.2em] text-stone-500">Hero</div>
              <div className="mt-1 font-semibold text-stone-100">{listing.hero_name}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
              <div className="uppercase tracking-[0.2em] text-stone-500">Class</div>
              <div className="mt-1 font-semibold text-stone-100">{listing.hero_class || 'Unknown'}</div>
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[0.72rem] text-stone-300">
            On-chain listing object: <span className="break-all text-stone-200">{listing.listing_object_id || '—'}</span>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-white/8 px-4 py-4">
          {mode === 'sale' ? (
            <div className="text-[0.8rem] text-amber-100">Price: {Number(listing.sale_price_one || 0)} ONE</div>
          ) : (
            <div className="text-[0.8rem] text-emerald-100">
              Rent: {Number(listing.rent_price_one || 0)} ONE · Collateral: {Number(listing.collateral_one || 0)} ONE
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => (mode === 'sale' ? void handleBuy(listing) : void handleRent(listing))}
            className="h-8 rounded-lg border-amber-400/28 bg-amber-400/[0.08] text-[0.68rem] tracking-[0.12em] uppercase text-amber-100 hover:bg-amber-400/[0.14]"
          >
            {isBusy ? 'Pending...' : mode === 'sale' ? 'Buy NFT' : 'Rent NFT'}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center text-stone-200">
        <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
      </main>
    );
  }

  return (
    <main className="relative h-full overflow-y-auto bg-[#090909] text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,169,90,0.10),transparent_26%),radial-gradient(circle_at_85%_12%,rgba(103,132,170,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-12">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-stone-400">
              <Gem className="h-3.5 w-3.5 text-amber-300" />
              Live NFT Market
            </div>
            <h1 className="font-cinzel text-3xl uppercase tracking-[0.14em] text-stone-100 md:text-5xl">
              OneChain Marketplace
            </h1>
            <p className="mt-3 max-w-3xl text-[0.95rem] leading-7 text-stone-400">
              Real listings only: buy NFTs currently listed for sale, or rent active rental offers directly through on-chain contract actions.
            </p>
          </div>
          <Link
            href="/account"
            className="inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.03] px-4 text-[0.7rem] uppercase tracking-[0.2em] text-stone-300 transition-colors hover:border-amber-400/30 hover:text-amber-100"
          >
            Back to Account
          </Link>
        </div>

        {(message || error) && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-[0.74rem] ${error ? 'border-rose-300/35 bg-rose-300/[0.08] text-rose-100' : 'border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-100'}`}
          >
            {error || message}
          </div>
        )}

        <div className="mb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by item, lore, hero, class..."
              className="h-10 rounded-lg border-white/12 bg-white/[0.02] pl-9 text-[0.85rem] placeholder:text-stone-500"
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as MarketTab)}>
          <TabsList className="mb-6 h-10 rounded-lg border border-white/8 bg-white/[0.02] p-1">
            <TabsTrigger value="sale" className="h-8 rounded-md text-[0.72rem] uppercase tracking-[0.16em]">
              <Tag className="h-3.5 w-3.5" />
              Sale Offers
            </TabsTrigger>
            <TabsTrigger value="rental" className="h-8 rounded-md text-[0.72rem] uppercase tracking-[0.16em]">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Rental Offers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sale">
            {visibleSales.length === 0 ? (
              <Card className="rounded-[20px] border-white/8 bg-[linear-gradient(180deg,rgba(18,18,22,0.92),rgba(11,11,13,0.96))] py-12">
                <CardContent className="flex flex-col items-center gap-4 text-center">
                  <ShoppingCart className="h-10 w-10 text-stone-500" />
                  <h3 className="font-cinzel text-xl uppercase tracking-[0.12em] text-stone-200">No Active Sale Offers</h3>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleSales.map((listing) => renderListingCard(listing, 'sale'))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rental">
            {visibleRentals.length === 0 ? (
              <Card className="rounded-[20px] border-white/8 bg-[linear-gradient(180deg,rgba(18,18,22,0.92),rgba(11,11,13,0.96))] py-12">
                <CardContent className="flex flex-col items-center gap-4 text-center">
                  <ShieldCheck className="h-10 w-10 text-stone-500" />
                  <h3 className="font-cinzel text-xl uppercase tracking-[0.12em] text-stone-200">No Active Rental Offers</h3>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleRentals.map((listing) => renderListingCard(listing, 'rental'))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
