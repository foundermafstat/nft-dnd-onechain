'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRightLeft,
  Coins,
  Filter,
  Gem,
  Search,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useOnechainWalletExecutor } from '@/hooks/useOnechainWalletExecutor';
import {
  buySaleListing,
  listInventoryForRent,
  listInventoryForSale,
  startRental,
  type OneChainResult,
} from '@/lib/OneChain';

type MarketAction = 'buy' | 'sell' | 'rent_out' | 'rent_now';
type MarketType = 'weapon' | 'trinket' | 'artifact' | 'stronghold';
type MarketTab = 'discover' | 'sell' | 'lend' | 'rent';

interface MarketCard {
  id: string;
  name: string;
  type: MarketType;
  rarity: 'Epic' | 'Legendary' | 'Mythic';
  lore: string;
  image: string;
  buyPrice: number;
  rentPrice: number;
  owner: string;
  availableActions: MarketAction[];
}

const nftInventory: MarketCard[] = [
  {
    id: 'nft-01',
    name: 'Astral Bastion Sigil',
    type: 'stronghold',
    rarity: 'Mythic',
    lore: 'A floating citadel marker forged after the Siege of Black Lantern.',
    image: '/images/dnd1.png',
    buyPrice: 980,
    rentPrice: 86,
    owner: 'Grim Aldric',
    availableActions: ['buy', 'rent_now'],
  },
  {
    id: 'nft-02',
    name: 'Tome of Ember Verdict',
    type: 'artifact',
    rarity: 'Legendary',
    lore: 'Its pages update after each faction vote and preserve campaign outcomes.',
    image: '/images/dnd2.png',
    buyPrice: 620,
    rentPrice: 55,
    owner: 'Maeve of Ash',
    availableActions: ['buy', 'sell', 'rent_out'],
  },
  {
    id: 'nft-03',
    name: 'Obsidian Oathblade',
    type: 'weapon',
    rarity: 'Epic',
    lore: 'A relic sword awakened during a party wipe that still remembers the route.',
    image: '/images/dnd3.png',
    buyPrice: 415,
    rentPrice: 39,
    owner: 'Dusk Runner',
    availableActions: ['buy', 'rent_now', 'sell'],
  },
  {
    id: 'nft-04',
    name: 'Warden Prism Charm',
    type: 'trinket',
    rarity: 'Legendary',
    lore: 'Enhances ward pulses and amplifies AI-directed defensive synergies.',
    image: '/images/dnd4.png',
    buyPrice: 510,
    rentPrice: 47,
    owner: 'Sable Choir',
    availableActions: ['rent_now', 'rent_out'],
  },
  {
    id: 'nft-05',
    name: 'Hollow Crown Relay',
    type: 'artifact',
    rarity: 'Mythic',
    lore: 'Records council verdicts and unlocks alternate contract chains.',
    image: '/images/dnd1.png',
    buyPrice: 1120,
    rentPrice: 94,
    owner: 'Ivory Regent',
    availableActions: ['buy', 'sell', 'rent_out'],
  },
  {
    id: 'nft-06',
    name: 'Nightglass Bulwark',
    type: 'stronghold',
    rarity: 'Legendary',
    lore: 'A defensive anchor from the Frostwake campaign corridor.',
    image: '/images/dnd4.png',
    buyPrice: 740,
    rentPrice: 61,
    owner: 'Dawn Archive',
    availableActions: ['buy', 'rent_now'],
  },
  {
    id: 'nft-07',
    name: 'Vesper Fang',
    type: 'weapon',
    rarity: 'Epic',
    lore: 'Lightweight assassin blade tied to three no-alert clear records.',
    image: '/images/dnd3.png',
    buyPrice: 365,
    rentPrice: 34,
    owner: 'Mist Seeker',
    availableActions: ['buy', 'sell', 'rent_now'],
  },
  {
    id: 'nft-08',
    name: 'Ashen Pact Seal',
    type: 'trinket',
    rarity: 'Legendary',
    lore: 'Increases faction trust gain after high-risk diplomatic branches.',
    image: '/images/dnd2.png',
    buyPrice: 545,
    rentPrice: 49,
    owner: 'Coal Magistrate',
    availableActions: ['buy', 'rent_out'],
  },
  {
    id: 'nft-09',
    name: 'Sunken Choir Catalyst',
    type: 'artifact',
    rarity: 'Epic',
    lore: 'Converts crowd-control chains into amplified relic damage windows.',
    image: '/images/dnd2.png',
    buyPrice: 392,
    rentPrice: 36,
    owner: 'Silent Reliquary',
    availableActions: ['buy', 'sell', 'rent_now'],
  },
  {
    id: 'nft-10',
    name: 'Gilded Root Talon',
    type: 'weapon',
    rarity: 'Legendary',
    lore: 'A feral spear grown from a world-event root breach.',
    image: '/images/dnd3.png',
    buyPrice: 688,
    rentPrice: 58,
    owner: 'Thorn Broker',
    availableActions: ['buy', 'rent_now', 'rent_out'],
  },
  {
    id: 'nft-11',
    name: 'Obelisk Keyframe',
    type: 'stronghold',
    rarity: 'Epic',
    lore: 'Route-lock NFT used to open premium challenge corridors for parties.',
    image: '/images/dnd1.png',
    buyPrice: 455,
    rentPrice: 41,
    owner: 'Granite Ledger',
    availableActions: ['buy', 'sell', 'rent_out'],
  },
  {
    id: 'nft-12',
    name: 'Mirrorbrand Sigil',
    type: 'trinket',
    rarity: 'Mythic',
    lore: 'Enables mirrored combat snapshots and rare chronicle badge triggers.',
    image: '/images/dnd4.png',
    buyPrice: 1260,
    rentPrice: 102,
    owner: 'Pale Vanguard',
    availableActions: ['buy', 'rent_now'],
  },
];

const rarityStyle = {
  Mythic: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  Legendary: 'bg-sky-500/12 text-sky-200 border-sky-400/25',
  Epic: 'bg-emerald-500/12 text-emerald-200 border-emerald-400/25',
};

const typeLabel: Record<MarketType, string> = {
  weapon: 'Weapon',
  trinket: 'Trinket',
  artifact: 'Artifact',
  stronghold: 'Stronghold',
};

const actionStyle: Record<MarketAction, { label: string; icon: ReactNode; className: string }> = {
  buy: {
    label: 'Buy',
    icon: <ShoppingCart className="h-3.5 w-3.5" />,
    className: 'border-amber-400/28 bg-amber-400/[0.08] text-amber-100 hover:bg-amber-400/[0.14]',
  },
  sell: {
    label: 'Sell',
    icon: <Tag className="h-3.5 w-3.5" />,
    className: 'border-sky-400/24 bg-sky-400/[0.08] text-sky-100 hover:bg-sky-400/[0.14]',
  },
  rent_out: {
    label: 'Rent Out',
    icon: <Wallet className="h-3.5 w-3.5" />,
    className: 'border-violet-400/24 bg-violet-400/[0.08] text-violet-100 hover:bg-violet-400/[0.14]',
  },
  rent_now: {
    label: 'Rent Now',
    icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
    className: 'border-emerald-400/24 bg-emerald-400/[0.08] text-emerald-100 hover:bg-emerald-400/[0.14]',
  },
};

function MarketCardItem({
  item,
  inventoryObjectId,
  listingObjectId,
  onInventoryObjectIdChange,
  onListingObjectIdChange,
  onAction,
  isActionBusy,
}: {
  item: MarketCard;
  inventoryObjectId: string;
  listingObjectId: string;
  onInventoryObjectIdChange: (value: string) => void;
  onListingObjectIdChange: (value: string) => void;
  onAction: (item: MarketCard, action: MarketAction) => void;
  isActionBusy: boolean;
}) {
  return (
    <Card className="group overflow-hidden rounded-[24px] border-white/8 bg-[linear-gradient(180deg,rgba(19,19,22,0.94),rgba(12,12,14,0.96))] py-0 shadow-[0_18px_36px_rgba(0,0,0,0.35)]">
      <CardHeader className="px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[0.62rem] tracking-[0.22em] uppercase ${rarityStyle[item.rarity]}`}>
            {item.rarity}
          </Badge>
          <Badge variant="outline" className="rounded-full border-white/12 bg-white/[0.03] px-2.5 py-1 text-[0.62rem] tracking-[0.2em] uppercase text-stone-300">
            {typeLabel[item.type]}
          </Badge>
        </div>
        <CardTitle className="font-cinzel text-[1rem] uppercase tracking-[0.1em] text-stone-100">
          {item.name}
        </CardTitle>
        <CardDescription className="text-[0.78rem] leading-6 text-stone-400">
          {item.lore}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div className="relative mb-4 flex h-56 items-center justify-center overflow-hidden rounded-[18px] border border-white/8 bg-[radial-gradient(circle_at_30%_18%,rgba(230,194,123,0.14),transparent_42%),radial-gradient(circle_at_70%_75%,rgba(87,118,157,0.14),transparent_44%),linear-gradient(180deg,rgba(17,17,20,0.96),rgba(11,11,13,0.96))]">
          <img
            src={item.image}
            alt={item.name}
            className="h-[110%] w-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)] transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[0.72rem]">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
            <div className="uppercase tracking-[0.2em] text-stone-500">Buy</div>
            <div className="mt-1 font-semibold text-amber-100">{item.buyPrice} ONE</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
            <div className="uppercase tracking-[0.2em] text-stone-500">Rent/Day</div>
            <div className="mt-1 font-semibold text-emerald-100">{item.rentPrice} ONE</div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-2 border-t border-white/8 px-4 py-4">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-stone-500">
          Owner: <span className="text-stone-300">{item.owner}</span>
        </div>
        <div className="space-y-2">
          <Input
            value={inventoryObjectId}
            onChange={(event) => onInventoryObjectIdChange(event.target.value)}
            placeholder="Inventory NFT object id (for Sell/Rent Out)"
            className="h-8 rounded-lg border-white/12 bg-white/[0.02] text-[0.66rem] placeholder:text-stone-500"
          />
          <Input
            value={listingObjectId}
            onChange={(event) => onListingObjectIdChange(event.target.value)}
            placeholder="Listing object id (for Buy/Rent Now)"
            className="h-8 rounded-lg border-white/12 bg-white/[0.02] text-[0.66rem] placeholder:text-stone-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {item.availableActions.map((action) => (
            <Button
              key={`${item.id}-${action}`}
              variant="outline"
              size="sm"
              disabled={isActionBusy}
              onClick={() => onAction(item, action)}
              className={`h-8 rounded-lg text-[0.68rem] tracking-[0.12em] uppercase ${actionStyle[action].className}`}
            >
              {actionStyle[action].icon}
              {isActionBusy ? 'Pending...' : actionStyle[action].label}
            </Button>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}

export default function MarketplacePage() {
  const { walletAddress } = useAuth();
  const { executor, isExecuting: isWalletExecuting } = useOnechainWalletExecutor();
  const [query, setQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tab, setTab] = useState<MarketTab>('discover');
  const [inventoryObjectIds, setInventoryObjectIds] = useState<Record<string, string>>({});
  const [listingObjectIds, setListingObjectIds] = useState<Record<string, string>>({});
  const [actionStateByCard, setActionStateByCard] = useState<Record<string, boolean>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const visibleCards = useMemo(() => {
    return nftInventory.filter((item) => {
      const matchesQuery =
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.lore.toLowerCase().includes(query.toLowerCase());
      const matchesRarity = rarityFilter === 'all' || item.rarity.toLowerCase() === rarityFilter;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;

      if (tab === 'sell' && !item.availableActions.includes('sell')) return false;
      if (tab === 'lend' && !item.availableActions.includes('rent_out')) return false;
      if (tab === 'rent' && !item.availableActions.includes('rent_now')) return false;

      return matchesQuery && matchesRarity && matchesType;
    });
  }, [query, rarityFilter, typeFilter, tab]);

  const setCardBusy = (cardId: string, isBusy: boolean) => {
    setActionStateByCard((prev) => ({ ...prev, [cardId]: isBusy }));
  };

  const writeInventoryObjectId = (cardId: string, value: string) => {
    setInventoryObjectIds((prev) => ({ ...prev, [cardId]: value }));
  };

  const writeListingObjectId = (cardId: string, value: string) => {
    setListingObjectIds((prev) => ({ ...prev, [cardId]: value }));
  };

  const reportResult = (card: MarketCard, action: MarketAction, result: OneChainResult) => {
    if (!result.success) {
      throw new Error(result.error || `Failed to ${actionStyle[action].label.toLowerCase()}.`);
    }
    const shortHash = result.hash ? `${result.hash.slice(0, 12)}...` : 'submitted';
    setActionMessage(`${card.name}: ${actionStyle[action].label} confirmed (${shortHash}).`);
  };

  const handleAction = async (card: MarketCard, action: MarketAction) => {
    setActionError(null);
    setActionMessage(null);

    if (!walletAddress || !executor) {
      setActionError('Connect OneWallet to execute marketplace transactions.');
      return;
    }

    const inventoryObjectId = (inventoryObjectIds[card.id] || '').trim();
    const listingObjectId = (listingObjectIds[card.id] || '').trim();

    setCardBusy(card.id, true);
    try {
      if (action === 'sell') {
        if (!inventoryObjectId) {
          throw new Error('Set Inventory NFT object id before listing for sale.');
        }
        const result = await listInventoryForSale({
          sellerAddress: walletAddress,
          inventoryNftObjectId: inventoryObjectId,
          priceOne: card.buyPrice,
        }, executor);
        reportResult(card, action, result);
        if (result.objectId) {
          writeListingObjectId(card.id, result.objectId);
        }
        return;
      }

      if (action === 'buy') {
        if (!listingObjectId) {
          throw new Error('Set Sale Listing object id before buying.');
        }
        const result = await buySaleListing({
          buyerAddress: walletAddress,
          saleListingObjectId: listingObjectId,
          priceOne: card.buyPrice,
        }, executor);
        reportResult(card, action, result);
        return;
      }

      if (action === 'rent_out') {
        if (!inventoryObjectId) {
          throw new Error('Set Inventory NFT object id before creating a rental listing.');
        }
        const result = await listInventoryForRent({
          lenderAddress: walletAddress,
          inventoryNftObjectId: inventoryObjectId,
          rentPriceOne: card.rentPrice,
          collateralOne: Math.max(0.01, Number((card.rentPrice * 2).toFixed(2))),
          durationMs: 24 * 60 * 60 * 1000,
        }, executor);
        reportResult(card, action, result);
        if (result.objectId) {
          writeListingObjectId(card.id, result.objectId);
        }
        return;
      }

      if (!listingObjectId) {
        throw new Error('Set Rental Listing object id before starting a rental.');
      }
      const result = await startRental({
        renterAddress: walletAddress,
        rentalListingObjectId: listingObjectId,
        rentPriceOne: card.rentPrice,
        collateralOne: Math.max(0.01, Number((card.rentPrice * 2).toFixed(2))),
      }, executor);
      reportResult(card, action, result);
    } catch (error: any) {
      setActionError(error?.message || 'Marketplace transaction failed.');
    } finally {
      setCardBusy(card.id, false);
    }
  };

  const renderCards = () => (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visibleCards.map((item) => (
        <MarketCardItem
          key={item.id}
          item={item}
          inventoryObjectId={inventoryObjectIds[item.id] || ''}
          listingObjectId={listingObjectIds[item.id] || ''}
          onInventoryObjectIdChange={(value) => writeInventoryObjectId(item.id, value)}
          onListingObjectIdChange={(value) => writeListingObjectId(item.id, value)}
          onAction={handleAction}
          isActionBusy={Boolean(actionStateByCard[item.id]) || isWalletExecuting}
        />
      ))}
    </div>
  );

  return (
    <main className="relative h-full overflow-y-auto bg-[#090909] text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,169,90,0.10),transparent_26%),radial-gradient(circle_at_85%_12%,rgba(103,132,170,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-12">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-stone-400">
              <Gem className="h-3.5 w-3.5 text-amber-300" />
              NFT Market
            </div>
            <h1 className="font-cinzel text-3xl uppercase tracking-[0.14em] text-stone-100 md:text-5xl">
              OneChain Marketplace
            </h1>
            <p className="mt-3 max-w-3xl text-[0.95rem] leading-7 text-stone-400">
              Trade lore-linked NFT assets from your campaign history: buy legendary cards, list your own cards for sale, rent out high-tier gear, or acquire rentals for your next run.
            </p>
            <p className="mt-2 text-[0.72rem] uppercase tracking-[0.14em] text-stone-500">
              Set onchain object ids directly in each card to execute real contract actions.
            </p>
          </div>
          <Link
            href="/game"
            className="inline-flex h-10 items-center rounded-lg border border-white/10 bg-white/[0.03] px-4 text-[0.7rem] uppercase tracking-[0.2em] text-stone-300 transition-colors hover:border-amber-400/30 hover:text-amber-100"
          >
            Back to Game
          </Link>
        </div>

        <Card className="mb-8 rounded-[22px] border-white/8 bg-[linear-gradient(180deg,rgba(18,18,22,0.92),rgba(11,11,13,0.96))] py-4">
          <CardContent className="px-4 md:px-6">
            {(actionMessage || actionError) && (
              <div className={`mb-3 rounded-lg border px-3 py-2 text-[0.72rem] tracking-[0.08em] ${actionError ? 'border-red-500/35 bg-red-500/8 text-red-200' : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100'}`}>
                {actionError || actionMessage}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by item name or lore..."
                  className="h-10 rounded-lg border-white/12 bg-white/[0.02] pl-9 text-[0.85rem] placeholder:text-stone-500"
                />
              </div>
              <Select value={rarityFilter} onValueChange={setRarityFilter}>
                <SelectTrigger className="h-10 w-full rounded-lg border-white/12 bg-white/[0.02] text-[0.8rem] md:w-44">
                  <SelectValue placeholder="Rarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rarities</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="legendary">Legendary</SelectItem>
                  <SelectItem value="mythic">Mythic</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10 w-full rounded-lg border-white/12 bg-white/[0.02] text-[0.8rem] md:w-44">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="weapon">Weapon</SelectItem>
                  <SelectItem value="trinket">Trinket</SelectItem>
                  <SelectItem value="artifact">Artifact</SelectItem>
                  <SelectItem value="stronghold">Stronghold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(value) => setTab(value as MarketTab)}>
          <TabsList className="mb-6 h-10 rounded-lg border border-white/8 bg-white/[0.02] p-1">
            <TabsTrigger value="discover" className="h-8 rounded-md text-[0.72rem] uppercase tracking-[0.16em]">
              <Filter className="h-3.5 w-3.5" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="sell" className="h-8 rounded-md text-[0.72rem] uppercase tracking-[0.16em]">
              <Tag className="h-3.5 w-3.5" />
              Sell
            </TabsTrigger>
            <TabsTrigger value="lend" className="h-8 rounded-md text-[0.72rem] uppercase tracking-[0.16em]">
              <Coins className="h-3.5 w-3.5" />
              Rent Out
            </TabsTrigger>
            <TabsTrigger value="rent" className="h-8 rounded-md text-[0.72rem] uppercase tracking-[0.16em]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Rent In
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover">
            {visibleCards.length === 0 ? (
              <Card className="rounded-[20px] border-white/8 bg-[linear-gradient(180deg,rgba(18,18,22,0.92),rgba(11,11,13,0.96))] py-12">
                <CardContent className="flex flex-col items-center gap-4 text-center">
                  <Gem className="h-10 w-10 text-stone-500" />
                  <h3 className="font-cinzel text-xl uppercase tracking-[0.12em] text-stone-200">
                    No cards found
                  </h3>
                  <p className="max-w-md text-[0.9rem] leading-7 text-stone-400">
                    Adjust filters or search query to discover matching NFT market listings.
                  </p>
                </CardContent>
              </Card>
            ) : (
              renderCards()
            )}
          </TabsContent>

          <TabsContent value="sell">
            {renderCards()}
          </TabsContent>

          <TabsContent value="lend">
            {renderCards()}
          </TabsContent>

          <TabsContent value="rent">
            {renderCards()}
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
