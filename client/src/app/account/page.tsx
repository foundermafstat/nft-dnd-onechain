'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Gem, HeartPulse, Loader2, Shield, Sparkles, Swords } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SERVER_URL } from '@/lib/config';
import { buildTxExplorerUrl } from '@/lib/onechainExplorer';

const panelClass =
  'rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,24,0.9),rgba(11,11,14,0.95))] shadow-[0_18px_36px_rgba(0,0,0,0.42)] backdrop-blur';

type CharacterRecord = {
  id: string;
  name: string;
  ancestry: string;
  class: string;
  alignment: string;
  level: number;
  state?: {
    onchain?: {
      heroSbtMintHash?: string;
      heroSbtSnapshot?: {
        alignment?: string;
        title?: string;
        background?: string;
        deity?: string;
        strength?: number;
        dexterity?: number;
        constitution?: number;
        intelligence?: number;
        wisdom?: number;
        charisma?: number;
        maxHp?: number;
        armorClass?: number;
        startingGoldGp?: number;
        gearSlots?: number;
        ruleset?: string;
        languages?: string[];
        talents?: string[];
        knownSpells?: string[];
      };
    };
  };
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  rarity: string;
  slots?: number;
  metadata?: Record<string, any>;
  lore?: string;
  is_nft?: boolean;
  blockchain_status?: string;
  onechain_token_id?: string | null;
};

type InventoryEntry = {
  id: string;
  acquired_at: string;
  is_equipped: boolean;
  quantity: number;
  slot_position: string;
  items: InventoryItem | null;
};

type OwnedNft = {
  entryId: string;
  characterId: string;
  characterName: string;
  acquiredAt: string;
  quantity: number;
  equipped: boolean;
  slot: string;
  item: InventoryItem;
};

type InventoryByCharacter = Record<string, InventoryEntry[]>;

type AbilityProfile = {
  id: string;
  name: string;
  description: string;
  ability_type: 'ancestry_feature' | 'class_feature' | 'talent' | 'skill' | 'spell';
  level_requirement: number;
  metadata?: {
    icon_key?: string;
    [key: string]: any;
  };
};

function shortHash(hash: string): string {
  if (!hash) return '—';
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function statModifier(stat: number): string {
  const modifier = Math.floor((stat - 10) / 2);
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

function abilityIconGlyph(ability: AbilityProfile): string {
  const iconKey = ability.metadata?.icon_key || '';
  if (iconKey.includes('talent')) return '✦';
  if (iconKey.includes('ancestry')) return '◈';
  if (iconKey.includes('class')) return '⬢';
  if (iconKey.includes('skill')) return '◉';
  if (iconKey.includes('spell')) return '✧';
  if (ability.ability_type === 'talent') return '✦';
  if (ability.ability_type === 'ancestry_feature') return '◈';
  if (ability.ability_type === 'class_feature') return '⬢';
  if (ability.ability_type === 'skill') return '◉';
  return '✧';
}

function itemIconGlyph(item: InventoryItem | null): string {
  const iconKey = item?.metadata?.icon_key || '';
  if (iconKey.includes('weapon')) return '⚔';
  if (iconKey.includes('armor')) return '⛨';
  if (iconKey.includes('magic')) return '✶';
  if (iconKey.includes('consumable')) return '◍';
  if (!item) return '·';
  if (item.category === 'Weapon') return '⚔';
  if (item.category === 'Armor') return '⛨';
  if (item.category === 'Gear') return '◍';
  return '✶';
}

function resolveNftImageUrl(item: InventoryItem): string {
  const normalizeAssetUrl = (value: string): string => {
    if (!value) return '';
    if (value.startsWith('ipfs://')) {
      return `https://ipfs.io/ipfs/${value.replace('ipfs://', '')}`;
    }
    return value;
  };

  const metadata = (item.metadata && typeof item.metadata === 'object') ? item.metadata : {};
  const explicitImage = normalizeAssetUrl(String(
    metadata.image ||
      metadata.imageUrl ||
      metadata.nftImage ||
      metadata.nftImageUrl ||
      metadata.ipfs_image_url ||
      metadata.media?.image ||
      '',
  ).trim());
  if (explicitImage) return explicitImage;

  const metadataCid = normalizeAssetUrl(String(metadata.metadataCid || '').trim());
  if (/^https?:\/\//i.test(metadataCid)) return metadataCid;

  return '';
}

function buildInventorySlots(
  entries: InventoryEntry[],
  totalSlots: number,
): Array<
  | null
  | {
      name: string;
      continuation: boolean;
      equipped: boolean;
    }
> {
  const slotCells: Array<
    | null
    | {
        name: string;
        continuation: boolean;
        equipped: boolean;
      }
  > = Array.from({ length: totalSlots }, () => null);

  let cursor = 0;
  for (const entry of entries) {
    const itemName = entry.items?.name || 'Unknown';
    const itemSlots = Math.max(1, entry.items?.slots || 1);
    const quantity = Math.max(1, entry.quantity || 1);

    for (let q = 0; q < quantity; q += 1) {
      for (let s = 0; s < itemSlots; s += 1) {
        if (cursor >= totalSlots) break;
        slotCells[cursor] = {
          name: itemName,
          continuation: s > 0,
          equipped: entry.is_equipped,
        };
        cursor += 1;
      }
    }
  }

  return slotCells;
}

export default function AccountPage() {
  const router = useRouter();
  const { playerId, isLoading } = useAuth();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterRecord[]>([]);
  const [ownedNfts, setOwnedNfts] = useState<OwnedNft[]>([]);
  const [inventoryByCharacter, setInventoryByCharacter] = useState<InventoryByCharacter>({});
  const [abilitiesByCharacter, setAbilitiesByCharacter] = useState<Record<string, AbilityProfile[]>>({});

  useEffect(() => {
    if (isLoading) return;
    if (!playerId) {
      router.replace('/');
      return;
    }

    const loadAccount = async () => {
      setIsPageLoading(true);
      setError(null);
      try {
        const charactersResponse = await fetch(`${SERVER_URL}/api/character/player/${playerId}`);
        const charactersPayload = await charactersResponse.json();
        if (!charactersResponse.ok || !charactersPayload?.success) {
          throw new Error(charactersPayload?.error || 'Failed to load character profile.');
        }

        const loadedCharacters = (charactersPayload.characters || []) as CharacterRecord[];
        setCharacters(loadedCharacters);

        const inventoryByCharacter = await Promise.all(
          loadedCharacters.map(async (character) => {
            const loadInventory = async () => {
              const response = await fetch(`${SERVER_URL}/api/character/${character.id}/inventory`);
              const payload = await response.json();
              if (!response.ok || !payload?.success) {
                throw new Error(payload?.error || `Failed to load inventory for ${character.name}.`);
              }
              return (payload.inventory || []) as InventoryEntry[];
            };

            let inventory = await loadInventory();
            if (inventory.length === 0) {
              await fetch(`${SERVER_URL}/api/character/${character.id}/inventory/ensure-starter-kit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              });
              inventory = await loadInventory();
            }

            const abilitiesResponse = await fetch(
              `${SERVER_URL}/api/ability/profile?class=${encodeURIComponent(character.class)}&ancestry=${encodeURIComponent(character.ancestry)}`,
            );
            const abilitiesPayload = await abilitiesResponse.json();
            if (!abilitiesResponse.ok || !abilitiesPayload?.success) {
              throw new Error(abilitiesPayload?.error || `Failed to load abilities for ${character.name}.`);
            }

            return {
              character,
              inventory,
              abilities: (abilitiesPayload.abilities || []) as AbilityProfile[],
            };
          }),
        );

        setInventoryByCharacter(
          inventoryByCharacter.reduce<InventoryByCharacter>((acc, current) => {
            acc[current.character.id] = current.inventory;
            return acc;
          }, {}),
        );

        setAbilitiesByCharacter(
          inventoryByCharacter.reduce<Record<string, AbilityProfile[]>>((acc, current) => {
            acc[current.character.id] = current.abilities;
            return acc;
          }, {}),
        );

        const nftList = inventoryByCharacter.flatMap(({ character, inventory }) =>
          inventory
            .filter((entry) => {
              const item = entry.items;
              if (!item) return false;
              return Boolean(item.is_nft) || item.blockchain_status === 'MINTED' || Boolean(item.onechain_token_id);
            })
            .map((entry) => ({
              entryId: entry.id,
              characterId: character.id,
              characterName: character.name,
              acquiredAt: entry.acquired_at,
              quantity: entry.quantity,
              equipped: entry.is_equipped,
              slot: entry.slot_position || 'backpack',
              item: entry.items as InventoryItem,
            })),
        );

        setOwnedNfts(nftList);
      } catch (loadError: any) {
        console.error(loadError);
        setError(loadError?.message || 'Failed to load account data.');
      } finally {
        setIsPageLoading(false);
      }
    };

    void loadAccount();
  }, [isLoading, playerId, router]);

  const sbtCards = useMemo(
    () =>
      characters
        .filter((character) => Boolean(character.state?.onchain?.heroSbtMintHash))
        .map((character) => ({
          id: character.id,
          heroName: character.name,
          ancestry: character.ancestry,
          level: character.level,
          heroClass: character.class,
          title: character.state?.onchain?.heroSbtSnapshot?.title || 'Adventurer',
          deity: character.state?.onchain?.heroSbtSnapshot?.deity || 'Unknown',
          alignment:
            character.state?.onchain?.heroSbtSnapshot?.alignment || character.alignment || 'Neutral',
          background: character.state?.onchain?.heroSbtSnapshot?.background || 'No background recorded.',
          ruleset: character.state?.onchain?.heroSbtSnapshot?.ruleset || 'Shadowdark-Quickstart-Strict-v2',
          mintHash: character.state?.onchain?.heroSbtMintHash || '',
          strength: character.state?.onchain?.heroSbtSnapshot?.strength ?? 10,
          dexterity: character.state?.onchain?.heroSbtSnapshot?.dexterity ?? 10,
          constitution: character.state?.onchain?.heroSbtSnapshot?.constitution ?? 10,
          intelligence: character.state?.onchain?.heroSbtSnapshot?.intelligence ?? 10,
          wisdom: character.state?.onchain?.heroSbtSnapshot?.wisdom ?? 10,
          charisma: character.state?.onchain?.heroSbtSnapshot?.charisma ?? 10,
          maxHp: character.state?.onchain?.heroSbtSnapshot?.maxHp ?? 0,
          armorClass: character.state?.onchain?.heroSbtSnapshot?.armorClass ?? 0,
          startingGoldGp: character.state?.onchain?.heroSbtSnapshot?.startingGoldGp ?? 0,
          gearSlots: character.state?.onchain?.heroSbtSnapshot?.gearSlots ?? 0,
          languages: character.state?.onchain?.heroSbtSnapshot?.languages || [],
          talents: character.state?.onchain?.heroSbtSnapshot?.talents || [],
          knownSpells: character.state?.onchain?.heroSbtSnapshot?.knownSpells || [],
        })),
    [characters],
  );

  const ordinaryInventoryByCharacter = useMemo(() => {
    return Object.entries(inventoryByCharacter).reduce<Record<string, InventoryEntry[]>>((acc, [characterId, inventory]) => {
      acc[characterId] = inventory.filter((entry) => {
        const item = entry.items;
        if (!item) return false;
        return !(item.is_nft || item.blockchain_status === 'MINTED' || item.onechain_token_id);
      });
      return acc;
    }, {});
  }, [inventoryByCharacter]);

  if (isLoading || isPageLoading) {
    return (
      <main className="flex h-full items-center justify-center text-amber-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
      </main>
    );
  }

  return (
    <main className="relative h-full overflow-y-auto custom-scrollbar">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(214,172,93,0.08),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(102,130,168,0.08),transparent_32%)]" />
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        {error && (
          <section className={`${panelClass} mb-6 border-rose-400/20 bg-[linear-gradient(180deg,rgba(48,18,23,0.6),rgba(24,10,14,0.86))] p-4 text-[0.8rem] text-rose-200`}>
            {error}
          </section>
        )}

        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2 text-[0.66rem] uppercase tracking-[0.24em] text-amber-300/80">
            <Crown className="h-3.5 w-3.5" />
            Soulbound Legacy
          </div>
          {sbtCards.length === 0 ? (
            <div className={`${panelClass} p-6 text-[0.82rem] text-stone-400`}>
              SBT token not found yet. Forge your first hero to mint an identity token.
            </div>
          ) : (
            <div className="space-y-5">
              {sbtCards.map((sbt) => {
                const ordinaryInventory = ordinaryInventoryByCharacter[sbt.id] || [];
                const totalSlots = sbt.gearSlots > 0 ? sbt.gearSlots : Math.max(sbt.strength, 10);
                const slotCells = buildInventorySlots(ordinaryInventory, totalSlots);
                const usedSlots = slotCells.filter(Boolean).length;

                return (
                  <div
                    key={sbt.id}
                    className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
                  >
                    <article className={`${panelClass} relative overflow-hidden border-amber-400/24 bg-[linear-gradient(135deg,rgba(40,28,17,0.85)_0%,rgba(17,15,18,0.95)_48%,rgba(9,12,18,0.96)_100%)] p-6 md:p-7`}>
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(249,210,132,0.12),transparent_35%),radial-gradient(circle_at_94%_0%,rgba(107,143,203,0.12),transparent_38%)]" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />

                      <div className="relative z-10 mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h2 className="font-cinzel text-3xl uppercase tracking-[0.1em] text-amber-50 md:text-[2.2rem]">
                            {sbt.heroName}
                          </h2>
                          <p className="mt-2 text-[0.74rem] uppercase tracking-[0.22em] text-stone-300/85">
                            Level {sbt.level} {sbt.heroClass} · {sbt.ancestry} · {sbt.title}
                          </p>
                        </div>
                        <div className="rounded-full border border-amber-300/30 bg-amber-300/[0.12] px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-amber-100">
                          Soulbound Token
                        </div>
                      </div>

                      <div className="relative z-10 mb-5 grid grid-cols-6 gap-2.5">
                          {[
                            { label: 'STR', value: sbt.strength },
                            { label: 'DEX', value: sbt.dexterity },
                            { label: 'CON', value: sbt.constitution },
                            { label: 'INT', value: sbt.intelligence },
                            { label: 'WIS', value: sbt.wisdom },
                            { label: 'CHA', value: sbt.charisma },
                          ].map((stat) => (
                            <div
                              key={stat.label}
                              className="rounded-xl border border-white/12 bg-[linear-gradient(180deg,rgba(22,23,28,0.92),rgba(13,14,17,0.94))] px-2.5 py-2"
                            >
                              <p className="text-[0.58rem] uppercase tracking-[0.2em] text-stone-500">{stat.label}</p>
                              <div className="mt-1 flex items-end justify-between">
                                <p className="font-cinzel text-2xl leading-none text-stone-100 md:text-3xl">{stat.value}</p>
                                <p className="text-[0.7rem] font-semibold text-amber-200">{statModifier(stat.value)}</p>
                              </div>
                            </div>
                          ))}
                      </div>

                      <div className="relative z-10 mb-4 grid gap-2.5 md:grid-cols-3">
                        <div className="rounded-xl border border-rose-300/25 bg-rose-300/[0.08] px-3 py-2.5">
                          <p className="flex items-center gap-1 text-[0.58rem] uppercase tracking-[0.16em] text-rose-200/85">
                            <HeartPulse className="h-3 w-3" />
                            Max HP
                          </p>
                          <p className="mt-1 font-cinzel text-2xl text-rose-100">{sbt.maxHp}</p>
                        </div>
                        <div className="rounded-xl border border-sky-300/25 bg-sky-300/[0.08] px-3 py-2.5">
                          <p className="flex items-center gap-1 text-[0.58rem] uppercase tracking-[0.16em] text-sky-200/85">
                            <Shield className="h-3 w-3" />
                            Armor Class
                          </p>
                          <p className="mt-1 font-cinzel text-2xl text-sky-100">{sbt.armorClass}</p>
                        </div>
                        <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.08] px-3 py-2.5">
                          <p className="flex items-center gap-1 text-[0.58rem] uppercase tracking-[0.16em] text-amber-200/85">
                            <Swords className="h-3 w-3" />
                            Gear Slots
                          </p>
                          <p className="mt-1 font-cinzel text-2xl text-amber-100">{sbt.gearSlots}</p>
                        </div>
                      </div>

                      <div className="relative z-10 grid gap-2.5 text-[0.74rem] text-stone-300">
                        <div className="rounded-xl border border-white/10 bg-black/24 px-3 py-2.5">
                          <p className="text-[0.58rem] uppercase tracking-[0.18em] text-stone-500">
                            Alignment / Deity / Starting Gold
                          </p>
                          <p className="mt-1.5">
                            {sbt.alignment} · {sbt.deity} · {sbt.startingGoldGp} GP
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/24 px-3 py-2.5">
                          <p className="text-[0.58rem] uppercase tracking-[0.18em] text-stone-500">Background Chronicle</p>
                          <p className="mt-1.5 leading-6 text-stone-300">{sbt.background}</p>
                        </div>
                        <div className="grid gap-2.5 md:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-black/24 px-3 py-2.5">
                            <p className="text-[0.58rem] uppercase tracking-[0.18em] text-stone-500">Languages</p>
                            <p className="mt-1.5">
                              {sbt.languages.length > 0 ? sbt.languages.join(', ') : 'No languages recorded'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/24 px-3 py-2.5">
                            <p className="text-[0.58rem] uppercase tracking-[0.18em] text-stone-500">Talents</p>
                            <p className="mt-1.5">
                              {sbt.talents.length > 0 ? sbt.talents.join(', ') : 'No talents recorded'}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/24 px-3 py-2.5">
                          <p className="text-[0.58rem] uppercase tracking-[0.18em] text-stone-500">Known Spells</p>
                          <p className="mt-1.5">
                            {sbt.knownSpells.length > 0 ? sbt.knownSpells.join(', ') : 'No spells recorded'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/24 px-3 py-2.5">
                          <p className="text-[0.58rem] uppercase tracking-[0.18em] text-stone-500">Talents & Abilities (DB)</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(abilitiesByCharacter[sbt.id] || []).map((ability) => (
                              <div
                                key={`${sbt.id}-ability-${ability.id}`}
                                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-2 py-1"
                                title={ability.description}
                              >
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/[0.12] text-[0.58rem] text-amber-100">
                                  {abilityIconGlyph(ability)}
                                </span>
                                <span className="text-[0.66rem] text-stone-200">{ability.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2.5">
                          <p className="text-[0.58rem] uppercase tracking-[0.18em] text-amber-200/80">
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              Ruleset / Mint Signature
                            </span>
                          </p>
                          <p className="mt-1.5 text-amber-50/90">
                            {sbt.ruleset} · {shortHash(sbt.mintHash)}
                          </p>
                        </div>
                      </div>
                    </article>

                    <article className={`${panelClass} border-white/12 bg-[linear-gradient(180deg,rgba(15,16,20,0.92),rgba(10,11,14,0.96))] p-4 md:p-5`}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-cinzel text-[0.95rem] uppercase tracking-[0.14em] text-stone-100">
                          Inventory Vault
                        </p>
                        <p className="rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-amber-100">
                          {usedSlots}/{totalSlots} slots used
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                        {slotCells.map((slot, index) => (
                          <div
                            key={`${sbt.id}-slot-${index + 1}`}
                            className={`rounded-lg border px-2 py-2 ${
                              slot
                                ? slot.continuation
                                  ? 'border-amber-500/18 bg-amber-500/[0.05]'
                                  : 'border-amber-400/24 bg-amber-400/[0.08]'
                                : 'border-white/8 bg-black/25'
                            }`}
                          >
                            <p className="text-[0.52rem] uppercase tracking-[0.14em] text-stone-500">Slot {index + 1}</p>
                            <p className="mt-1 inline-flex items-center gap-1 truncate text-[0.68rem] text-stone-200">
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] text-[0.55rem] text-amber-200">
                                {itemIconGlyph(
                                  slot
                                    ? {
                                        id: `${index}`,
                                        name: slot.name,
                                        category: 'Gear',
                                        rarity: 'Common',
                                      }
                                    : null,
                                )}
                              </span>
                              {slot ? (slot.continuation ? `${slot.name} (cont.)` : slot.name) : 'Empty'}
                            </p>
                            {slot?.equipped && !slot.continuation && (
                              <p className="mt-1 text-[0.52rem] uppercase tracking-[0.14em] text-emerald-300">
                                Equipped
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="pb-6">
          <div className="mb-3 flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.24em] text-stone-500">
            <Gem className="h-3.5 w-3.5" />
            Owned NFT Items
          </div>
          {ownedNfts.length === 0 ? (
            <div className={`${panelClass} p-6 text-[0.82rem] text-stone-400`}>
              No minted NFT items in inventory yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ownedNfts.map((nft) => {
                const imageUrl = resolveNftImageUrl(nft.item);
                return (
                <article key={nft.entryId} className={`${panelClass} p-4`}>
                  {imageUrl ? (
                    <div className="mb-3 aspect-square overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(214,172,93,0.16),transparent_45%),linear-gradient(180deg,rgba(20,20,24,0.92),rgba(10,10,12,0.96))]">
                      <img
                        src={imageUrl}
                        alt={nft.item.name}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,24,0.92),rgba(10,10,12,0.96))] text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">
                      no nft image
                    </div>
                  )}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-cinzel text-[0.92rem] uppercase tracking-[0.09em] text-stone-100">
                        {nft.item.name}
                      </h3>
                      <p className="mt-1 text-[0.64rem] uppercase tracking-[0.14em] text-stone-500">
                        {nft.item.category} · {nft.item.rarity}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.1] px-2 py-0.5 text-[0.56rem] uppercase tracking-[0.15em] text-emerald-200">
                      NFT
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[0.72rem] text-stone-300">
                    <p>
                      Hero: <span className="text-stone-200">{nft.characterName}</span>
                    </p>
                    <p>
                      Slot: <span className="text-stone-200">{nft.slot}</span>
                      {nft.equipped ? ' · Equipped' : ''}
                    </p>
                    {nft.item.onechain_token_id && (
                      <p className="break-all">
                        Token ID: <span className="text-stone-200">{nft.item.onechain_token_id}</span>
                      </p>
                    )}
                    <p className="text-stone-500">
                      Acquired:{' '}
                      {new Date(nft.acquiredAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {(() => {
                    const metadata = (nft.item.metadata && typeof nft.item.metadata === 'object')
                      ? (nft.item.metadata as Record<string, any>)
                      : {};
                    const shortDescription = String(
                      metadata.shortDescription || metadata.description || '',
                    ).trim();
                    const longLore = String(nft.item.lore || '').trim();
                    return (
                      <>
                        {shortDescription && (
                          <p className="mt-3 line-clamp-2 text-[0.74rem] leading-5 text-amber-100/90">
                            {shortDescription}
                          </p>
                        )}
                        {longLore && (
                          <p className="mt-2 line-clamp-3 text-[0.72rem] leading-5 text-stone-400">{longLore}</p>
                        )}
                      </>
                    );
                  })()}
                  {(() => {
                    const txHash = String(
                      (nft.item.metadata && typeof nft.item.metadata === 'object'
                        ? (nft.item.metadata as Record<string, any>).txHash
                        : '') || '',
                    ).trim();
                    const txUrl = buildTxExplorerUrl(txHash);
                    if (!txUrl) return null;
                    return (
                      <a
                        href={txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-[0.66rem] uppercase tracking-[0.16em] text-amber-300 underline underline-offset-4 hover:text-amber-100"
                      >
                        View Transaction
                      </a>
                    );
                  })()}
                </article>
              );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
