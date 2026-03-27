import { quoteAdventurePrepay, quoteHeroMintCost, type AdventurePrepayInput } from '@/lib/onechainEconomy';
import { SERVER_URL } from '@/lib/config';
import type { HeroSbtSnapshot } from '@/lib/shadowdarkSbt';
import {
  ONECHAIN_CONTRACT_META,
  ONECHAIN_ENTRY_TARGETS,
  assertOnechainContractConfigured,
} from '@/lib/onechainContract';
import {
  Ancestry,
  HeroClass,
  calculateGearSlotsForProfile,
  getProfileStatLimits,
  isOnechainObjectId,
  statsMeetLimits,
} from 'shared';
import { Transaction } from '@onelabs/sui/transactions';

type TxKind =
  | 'hero_sbt_mint'
  | 'hero_progress_update'
  | 'adventure_prepay'
  | 'adventure_finalize'
  | 'inventory_nft_mint'
  | 'market_sale'
  | 'market_rent';

export interface OneChainResult {
  success: boolean;
  kind: TxKind;
  hash?: string;
  sessionId?: number;
  objectId?: string;
  target?: string;
  packageId?: string;
  registryObjectId?: string;
  paidOne?: number;
  gasFeeOne?: number;
  error?: string;
}

export interface OnechainTxExecutionResult {
  digest?: string;
  events?: Array<{ type?: string; parsedJson?: Record<string, any> }>;
  objectChanges?: Array<{
    type?: string;
    objectType?: string;
    objectId?: string;
    [key: string]: any;
  }>;
  effects?: any;
  rawEffects?: number[];
}

export interface OnechainWalletExecutor {
  accountAddress: string;
  execute: (tx: unknown) => Promise<OnechainTxExecutionResult>;
}

interface HeroMintInput {
  playerAddress: string;
  heroName: string;
  heroClass: string;
  ancestry: string;
  originLoreCid?: string;
  portraitCid?: string;
  heroSheetCid?: string;
  sbtSnapshot: HeroSbtSnapshot;
}

interface StartAdventureInput {
  playerAddress: string;
  generationCount: number;
  mintableDropsEstimate: number;
  playerRollsCount?: number;
  aiRollsCount?: number;
}

interface UpdateHeroProgressInput {
  playerAddress: string;
  heroObjectId: string;
  adminCapObjectId: string;
  levelDelta?: number;
  xpDelta?: number;
  loreScoreDelta?: number;
}

interface MintInventoryInput {
  playerAddress: string;
  recipient?: string;
  name?: string;
  rarityTier?: number;
  metadataCid?: string;
  loreCid?: string;
}

interface MintInventoryFromPrepayInput {
  playerAddress: string;
  adventureId: number;
  name?: string;
  rarityTier?: number;
  metadataCid?: string;
  loreCid?: string;
}

interface ListSaleInput {
  sellerAddress: string;
  inventoryNftObjectId: string;
  priceOne: number;
}

interface BuySaleInput {
  buyerAddress: string;
  saleListingObjectId: string;
  priceOne: number;
}

interface CancelSaleInput {
  sellerAddress: string;
  saleListingObjectId: string;
}

interface ListRentalInput {
  lenderAddress: string;
  inventoryNftObjectId: string;
  rentPriceOne: number;
  collateralOne: number;
  durationMs: number;
}

interface StartRentalInput {
  renterAddress: string;
  rentalListingObjectId: string;
  rentPriceOne: number;
  collateralOne: number;
}

interface ReturnRentalInput {
  renterAddress: string;
  rentalListingObjectId: string;
}

interface ClaimRentalDefaultInput {
  lenderAddress: string;
  rentalListingObjectId: string;
}

interface CancelRentalInput {
  lenderAddress: string;
  rentalListingObjectId: string;
}

export interface DiceConsumeResult {
  success: boolean;
  roll?: number;
  relayerTxHash?: string;
  remainingRolls?: number;
  error?: string;
}

const ONECHAIN_CLOCK_OBJECT_ID = process.env.NEXT_PUBLIC_ONECHAIN_CLOCK_OBJECT_ID || '0x6';
const MIST_PER_ONE = 1_000_000_000;

function round6(value: number): number {
  return Number(value.toFixed(6));
}

function oneToMist(one: number): number {
  return Math.max(0, Math.round(one * MIST_PER_ONE));
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function isUserRejectedRequest(error: unknown): boolean {
  const raw =
    typeof error === 'string'
      ? error
      : ((error as any)?.message || (error as any)?.toString?.() || '');
  const text = String(raw).toLowerCase();
  if (!text || text === '[object object]') {
    return true;
  }
  return (
    text.includes('user rejected') ||
    text.includes('request rejected') ||
    text.includes('rejected the request') ||
    text.includes('denied') ||
    text.includes('cancelled') ||
    text.includes('canceled')
  );
}

function isHeroClass(value: string): value is HeroClass {
  return (Object.values(HeroClass) as string[]).includes(value);
}

function isAncestry(value: string): value is Ancestry {
  return (Object.values(Ancestry) as string[]).includes(value);
}

function readNumberField(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseGasFeeOne(result: OnechainTxExecutionResult | null | undefined): number | undefined {
  const gasUsed = result?.effects?.gasUsed;
  if (!gasUsed) return undefined;
  const computationCost = readNumberField(gasUsed.computationCost) ?? 0;
  const storageCost = readNumberField(gasUsed.storageCost) ?? 0;
  const storageRebate = readNumberField(gasUsed.storageRebate) ?? 0;
  return round6((computationCost + storageCost - storageRebate) / MIST_PER_ONE);
}

function extractEvent<T extends Record<string, any>>(
  result: OnechainTxExecutionResult | null | undefined,
  eventName: string,
): T | null {
  const found = result?.events?.find((event) => event?.type?.endsWith(`::${eventName}`));
  return (found?.parsedJson as T | undefined) || null;
}

function extractCreatedObjectId(
  result: OnechainTxExecutionResult | null | undefined,
  typeSuffix: string,
): string | undefined {
  return result?.objectChanges?.find((change) => {
    if (change?.type !== 'created') return false;
    if (!change.objectId || !change.objectType) return false;
    return change.objectType.endsWith(typeSuffix);
  })?.objectId;
}

function csv(values: string[] | undefined): string {
  if (!values?.length) return '';
  return values.map((value) => value.trim()).filter(Boolean).join(',');
}

function ensureExecutor(
  executor: OnechainWalletExecutor | undefined,
  playerAddress: string,
  kind: TxKind,
): OneChainResult | null {
  if (!executor) {
    return {
      success: false,
      kind,
      error: 'Wallet signer is unavailable. Reconnect OneWallet and try again.',
    };
  }
  if (normalizeAddress(executor.accountAddress) !== normalizeAddress(playerAddress)) {
    return {
      success: false,
      kind,
      error: 'Connected wallet does not match the active player wallet.',
    };
  }
  return null;
}

function baseSuccessResult(
  kind: TxKind,
  hash: string | undefined,
  target: string,
  paidOne: number,
  gasFeeOne?: number,
): OneChainResult {
  return {
    success: true,
    kind,
    hash,
    target,
    packageId: ONECHAIN_CONTRACT_META.packageId,
    registryObjectId: ONECHAIN_CONTRACT_META.registryObjectId,
    paidOne: round6(paidOne),
    gasFeeOne,
  };
}

export async function mintHeroSBT(
  input: HeroMintInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.playerAddress, 'hero_sbt_mint');
    if (executorError) return executorError;
    if (!input.playerAddress) {
      return { success: false, kind: 'hero_sbt_mint', error: 'Wallet address is required.' };
    }
    if (!input.heroName.trim()) {
      return { success: false, kind: 'hero_sbt_mint', error: 'Hero name is required.' };
    }
    const stats = [
      input.sbtSnapshot.strength,
      input.sbtSnapshot.dexterity,
      input.sbtSnapshot.constitution,
      input.sbtSnapshot.intelligence,
      input.sbtSnapshot.wisdom,
      input.sbtSnapshot.charisma,
    ];
    const hasInvalidStat = stats.some((value) => value < 3 || value > 18);
    if (hasInvalidStat) {
      return { success: false, kind: 'hero_sbt_mint', error: 'SBT stats must be within 3-18.' };
    }
    if (!input.sbtSnapshot.deity.trim()) {
      return { success: false, kind: 'hero_sbt_mint', error: 'SBT deity is required.' };
    }
    if (!input.sbtSnapshot.title.trim()) {
      return { success: false, kind: 'hero_sbt_mint', error: 'SBT title is required.' };
    }
    if (!input.sbtSnapshot.languages.length) {
      return { success: false, kind: 'hero_sbt_mint', error: 'SBT languages cannot be empty.' };
    }
    const heroClassValue = input.heroClass.trim();
    const ancestryValue = input.ancestry.trim();
    if (!isHeroClass(heroClassValue) || !isAncestry(ancestryValue)) {
      return {
        success: false,
        kind: 'hero_sbt_mint',
        error: 'Hero class/ancestry is invalid for strict rules.',
      };
    }
    if (
      input.sbtSnapshot.heroClass !== heroClassValue ||
      input.sbtSnapshot.ancestry !== ancestryValue
    ) {
      return {
        success: false,
        kind: 'hero_sbt_mint',
        error: 'SBT snapshot profile does not match mint profile.',
      };
    }

    const strictStats = {
      str: input.sbtSnapshot.strength,
      dex: input.sbtSnapshot.dexterity,
      con: input.sbtSnapshot.constitution,
      int: input.sbtSnapshot.intelligence,
      wis: input.sbtSnapshot.wisdom,
      cha: input.sbtSnapshot.charisma,
    };
    const strictLimits = getProfileStatLimits(heroClassValue, ancestryValue);
    if (!statsMeetLimits(strictStats, strictLimits)) {
      return {
        success: false,
        kind: 'hero_sbt_mint',
        error: 'SBT stats do not satisfy strict class/ancestry limits.',
      };
    }
    if (
      input.sbtSnapshot.maxHp <= 0 ||
      input.sbtSnapshot.armorClass <= 0 ||
      input.sbtSnapshot.startingGoldGp <= 0
    ) {
      return {
        success: false,
        kind: 'hero_sbt_mint',
        error: 'SBT derived fields (HP/AC/gold) must be positive.',
      };
    }
    const expectedSlots = calculateGearSlotsForProfile({
      str: strictStats.str,
      con: strictStats.con,
      heroClass: heroClassValue,
      ancestry: ancestryValue,
    }).total;
    if (input.sbtSnapshot.gearSlots !== expectedSlots) {
      return {
        success: false,
        kind: 'hero_sbt_mint',
        error: `SBT gear slots mismatch. Expected ${expectedSlots}, got ${input.sbtSnapshot.gearSlots}.`,
      };
    }

    const quote = quoteHeroMintCost();
    const paymentMist = oneToMist(quote.mintFeeOne);
    const tx = new Transaction();
    const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(paymentMist)]);

    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.mintHeroSbt,
      arguments: [
        tx.object(ONECHAIN_CONTRACT_META.registryObjectId),
        paymentCoin,
        tx.pure.string(input.heroName.trim()),
        tx.pure.string(input.heroClass.trim()),
        tx.pure.string(input.ancestry.trim()),
        tx.pure.string(input.sbtSnapshot.alignment),
        tx.pure.string(input.sbtSnapshot.deity.trim()),
        tx.pure.string(input.sbtSnapshot.title.trim()),
        tx.pure.string(input.sbtSnapshot.background.trim()),
        tx.pure.u8(input.sbtSnapshot.strength),
        tx.pure.u8(input.sbtSnapshot.dexterity),
        tx.pure.u8(input.sbtSnapshot.constitution),
        tx.pure.u8(input.sbtSnapshot.intelligence),
        tx.pure.u8(input.sbtSnapshot.wisdom),
        tx.pure.u8(input.sbtSnapshot.charisma),
        tx.pure.u64(input.sbtSnapshot.maxHp),
        tx.pure.u64(input.sbtSnapshot.armorClass),
        tx.pure.u64(input.sbtSnapshot.startingGoldGp),
        tx.pure.u64(input.sbtSnapshot.gearSlots),
        tx.pure.string(csv(input.sbtSnapshot.languages)),
        tx.pure.string(csv(input.sbtSnapshot.talents)),
        tx.pure.string(csv(input.sbtSnapshot.knownSpells)),
        tx.pure.string((input.originLoreCid || '').trim()),
        tx.pure.string((input.portraitCid || '').trim()),
        tx.pure.string((input.heroSheetCid || '').trim()),
        tx.pure.string(input.sbtSnapshot.ruleset.trim()),
        tx.object(ONECHAIN_CLOCK_OBJECT_ID),
      ],
    });

    const execution = await executor!.execute(tx);
    const event = extractEvent<{ fee_paid_mist?: number | string }>(execution, 'HeroMinted');
    const paidOne =
      event?.fee_paid_mist !== undefined
        ? (Number(event.fee_paid_mist) || paymentMist) / MIST_PER_ONE
        : paymentMist / MIST_PER_ONE;
    return baseSuccessResult(
      'hero_sbt_mint',
      execution?.digest,
      ONECHAIN_ENTRY_TARGETS.mintHeroSbt,
      paidOne,
      parseGasFeeOne(execution),
    );
  } catch (error: any) {
    // Some wallet errors have non-enumerable properties, so we try to expose them
    const errorDetails = error?.message || (typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error));
    console.error('Error minting hero SBT on OneChain:', errorDetails);
    return {
      success: false,
      kind: 'hero_sbt_mint',
      error: errorDetails || 'Failed to mint hero SBT on OneChain',
    };
  }
}

export async function updateHeroProgressOnChain(
  input: UpdateHeroProgressInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.playerAddress, 'hero_progress_update');
    if (executorError) return executorError;
    if (!isOnechainObjectId(input.heroObjectId)) {
      return { success: false, kind: 'hero_progress_update', error: 'heroObjectId is invalid.' };
    }
    if (!isOnechainObjectId(input.adminCapObjectId)) {
      return { success: false, kind: 'hero_progress_update', error: 'adminCapObjectId is invalid.' };
    }

    const levelDelta = Math.max(0, Math.floor(input.levelDelta ?? 0));
    const xpDelta = Math.max(0, Math.floor(input.xpDelta ?? 0));
    const loreScoreDelta = Math.max(0, Math.floor(input.loreScoreDelta ?? 0));
    if (levelDelta === 0 && xpDelta === 0 && loreScoreDelta === 0) {
      return { success: false, kind: 'hero_progress_update', error: 'At least one progress delta must be > 0.' };
    }

    const tx = new Transaction();
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.updateHeroProgress,
      arguments: [
        tx.object(ONECHAIN_CONTRACT_META.registryObjectId),
        tx.object(input.adminCapObjectId),
        tx.object(input.heroObjectId),
        tx.pure.u64(levelDelta),
        tx.pure.u64(xpDelta),
        tx.pure.u64(loreScoreDelta),
      ],
    });

    const execution = await executor!.execute(tx);
    return baseSuccessResult(
      'hero_progress_update',
      execution?.digest,
      ONECHAIN_ENTRY_TARGETS.updateHeroProgress,
      0,
      parseGasFeeOne(execution),
    );
  } catch (error: any) {
    console.error('Error updating hero progress on OneChain:', error);
    return {
      success: false,
      kind: 'hero_progress_update',
      error: error?.message || 'Failed to update hero progress on OneChain',
    };
  }
}

export async function startAdventureWithPrepay(
  input: StartAdventureInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.playerAddress, 'adventure_prepay');
    if (executorError) return executorError;
    if (!input.playerAddress) {
      return { success: false, kind: 'adventure_prepay', error: 'Wallet address is required.' };
    }

    const quote = quoteAdventurePrepay({
      generationCount: input.generationCount,
      mintableDropsEstimate: input.mintableDropsEstimate,
    });
    const requiredOne = quote.entryFeeOne + quote.generationFeeOne + quote.mintReserveOne;
    const paymentMist = oneToMist(requiredOne);

    const tx = new Transaction();
    const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(paymentMist)]);
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.startAdventureAndPrepay,
      arguments: [
        tx.object(ONECHAIN_CONTRACT_META.registryObjectId),
        paymentCoin,
        tx.pure.u64(Math.max(0, Math.floor(input.generationCount))),
        tx.pure.u64(Math.max(0, Math.floor(input.mintableDropsEstimate))),
        tx.object(ONECHAIN_CLOCK_OBJECT_ID),
      ],
    });

    const execution = await executor!.execute(tx);
    const event = extractEvent<{ adventure_id?: number | string }>(execution, 'AdventureStarted');
    const adventureId = Number(event?.adventure_id);
    if (!Number.isInteger(adventureId) || adventureId <= 0) {
      throw new Error('Adventure id was not found in onchain events.');
    }

    try {
      const response = await fetch(`${SERVER_URL}/api/adventure/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adventureId,
          playerAddress: input.playerAddress,
          playerRollsCount: input.playerRollsCount ?? 64,
          aiRollsCount: input.aiRollsCount ?? 64,
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.warn('Dice session initialization failed after onchain start:', errorBody);
      }
    } catch (error) {
      console.warn('Failed to initialize offchain dice session:', error);
    }

    return {
      ...baseSuccessResult(
      'adventure_prepay',
      execution?.digest,
      ONECHAIN_ENTRY_TARGETS.startAdventureAndPrepay,
      requiredOne,
      parseGasFeeOne(execution),
      ),
      sessionId: adventureId,
    };
  } catch (error: any) {
    if (!isUserRejectedRequest(error)) {
      console.warn('Failed to start adventure on OneChain:', error);
    }
    return {
      success: false,
      kind: 'adventure_prepay',
      error: error?.message || 'Failed to start adventure on OneChain',
    };
  }
}

export async function mintInventoryNFT(
  input: MintInventoryInput | string,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const normalized: MintInventoryInput =
      typeof input === 'string'
        ? { playerAddress: input }
        : input;
    const executorError = ensureExecutor(executor, normalized.playerAddress, 'inventory_nft_mint');
    if (executorError) return executorError;

    const paymentOne = 0.08;
    const paymentMist = oneToMist(paymentOne);
    const tx = new Transaction();
    const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(paymentMist)]);
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.mintInventoryNftPaid,
      arguments: [
        tx.object(ONECHAIN_CONTRACT_META.registryObjectId),
        paymentCoin,
        tx.pure.address(normalized.recipient || normalized.playerAddress),
        tx.pure.string((normalized.name || 'Quest Relic').trim()),
        tx.pure.u8(Math.max(1, Math.min(5, Math.floor(normalized.rarityTier ?? 2)))),
        tx.pure.string((normalized.metadataCid || '').trim()),
        tx.pure.string((normalized.loreCid || '').trim()),
        tx.object(ONECHAIN_CLOCK_OBJECT_ID),
      ],
    });

    const execution = await executor!.execute(tx);
    const objectId = extractCreatedObjectId(execution, '::InventoryNFT');
    return {
      ...baseSuccessResult(
      'inventory_nft_mint',
      execution?.digest,
      ONECHAIN_ENTRY_TARGETS.mintInventoryNftPaid,
      paymentOne,
      parseGasFeeOne(execution),
      ),
      objectId,
    };
  } catch (error: any) {
    return { success: false, kind: 'inventory_nft_mint', error: error?.message || 'Mint failed' };
  }
}

export async function mintInventoryNFTFromPrepay(
  input: MintInventoryFromPrepayInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.playerAddress, 'inventory_nft_mint');
    if (executorError) return executorError;
    if (!Number.isInteger(input.adventureId) || input.adventureId <= 0) {
      return { success: false, kind: 'inventory_nft_mint', error: 'adventureId is required.' };
    }

    const tx = new Transaction();
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.mintInventoryNftFromPrepay,
      arguments: [
        tx.object(ONECHAIN_CONTRACT_META.registryObjectId),
        tx.pure.u64(input.adventureId),
        tx.pure.string((input.name || 'Adventure Drop').trim()),
        tx.pure.u8(Math.max(1, Math.min(5, Math.floor(input.rarityTier ?? 2)))),
        tx.pure.string((input.metadataCid || '').trim()),
        tx.pure.string((input.loreCid || '').trim()),
        tx.object(ONECHAIN_CLOCK_OBJECT_ID),
      ],
    });

    const execution = await executor!.execute(tx);
    const objectId = extractCreatedObjectId(execution, '::InventoryNFT');
    return {
      ...baseSuccessResult(
        'inventory_nft_mint',
        execution?.digest,
        ONECHAIN_ENTRY_TARGETS.mintInventoryNftFromPrepay,
        0,
        parseGasFeeOne(execution),
      ),
      sessionId: input.adventureId,
      objectId,
    };
  } catch (error: any) {
    return {
      success: false,
      kind: 'inventory_nft_mint',
      error: error?.message || 'Mint from prepay failed',
    };
  }
}

export async function endGame(
  playerAddress: string,
  sessionId: number | string | null,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const normalizedSessionId = Number(sessionId);
    if (!Number.isInteger(normalizedSessionId) || normalizedSessionId <= 0) {
      return { success: false, kind: 'adventure_finalize', error: 'Invalid adventure session id.' };
    }
    const executorError = ensureExecutor(executor, playerAddress, 'adventure_finalize');
    if (executorError) return executorError;

    const tx = new Transaction();
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.closeAdventureAndRefund,
      arguments: [
        tx.object(ONECHAIN_CONTRACT_META.registryObjectId),
        tx.pure.u64(normalizedSessionId),
      ],
    });

    const execution = await executor!.execute(tx);
    try {
      await fetch(`${SERVER_URL}/api/adventure/session/${normalizedSessionId}/finalize`, {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Failed to finalize local dice session after onchain close:', error);
    }

    return {
      ...baseSuccessResult(
        'adventure_finalize',
        execution?.digest,
        ONECHAIN_ENTRY_TARGETS.closeAdventureAndRefund,
        0,
        parseGasFeeOne(execution),
      ),
      sessionId: normalizedSessionId,
    };
  } catch (error: any) {
    console.error('Error ending game on OneChain:', error);
    return {
      success: false,
      kind: 'adventure_finalize',
      error: error.message || 'Failed to end game on OneChain',
    };
  }
}

// Backward-compatible API currently used by QuestBoard.
export async function startGame(
  playerAddress: string,
  executor?: OnechainWalletExecutor,
  options: Partial<AdventurePrepayInput> & { playerRollsCount?: number; aiRollsCount?: number } = {},
): Promise<OneChainResult> {
  return startAdventureWithPrepay({
    playerAddress,
    generationCount: options.generationCount ?? 3,
    mintableDropsEstimate: options.mintableDropsEstimate ?? 1,
    playerRollsCount: options.playerRollsCount ?? 64,
    aiRollsCount: options.aiRollsCount ?? 64,
  }, executor);
}

export async function listInventoryForSale(
  input: ListSaleInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.sellerAddress, 'market_sale');
    if (executorError) return executorError;
    if (!isOnechainObjectId(input.inventoryNftObjectId)) {
      return { success: false, kind: 'market_sale', error: 'Invalid Inventory NFT object id.' };
    }
    if (input.priceOne <= 0) {
      return { success: false, kind: 'market_sale', error: 'Sale price must be greater than zero.' };
    }

    const tx = new Transaction();
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.listInventoryForSale,
      arguments: [
        tx.object(input.inventoryNftObjectId),
        tx.pure.u64(oneToMist(input.priceOne)),
        tx.object(ONECHAIN_CLOCK_OBJECT_ID),
      ],
    });

    const execution = await executor!.execute(tx);
    return {
      ...baseSuccessResult(
        'market_sale',
        execution?.digest,
        ONECHAIN_ENTRY_TARGETS.listInventoryForSale,
        0,
        parseGasFeeOne(execution),
      ),
      objectId: extractCreatedObjectId(execution, '::SaleListing'),
    };
  } catch (error: any) {
    return { success: false, kind: 'market_sale', error: error?.message || 'Failed to list NFT for sale.' };
  }
}

export async function buySaleListing(
  input: BuySaleInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.buyerAddress, 'market_sale');
    if (executorError) return executorError;
    if (!isOnechainObjectId(input.saleListingObjectId)) {
      return { success: false, kind: 'market_sale', error: 'Invalid sale listing object id.' };
    }
    if (input.priceOne <= 0) {
      return { success: false, kind: 'market_sale', error: 'Buy price must be greater than zero.' };
    }

    const paymentMist = oneToMist(input.priceOne);
    const tx = new Transaction();
    const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(paymentMist)]);
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.buySaleListing,
      arguments: [
        tx.object(ONECHAIN_CONTRACT_META.registryObjectId),
        tx.object(input.saleListingObjectId),
        paymentCoin,
      ],
    });

    const execution = await executor!.execute(tx);
    return baseSuccessResult(
      'market_sale',
      execution?.digest,
      ONECHAIN_ENTRY_TARGETS.buySaleListing,
      input.priceOne,
      parseGasFeeOne(execution),
    );
  } catch (error: any) {
    return { success: false, kind: 'market_sale', error: error?.message || 'Failed to buy sale listing.' };
  }
}

export async function cancelSaleListing(
  input: CancelSaleInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.sellerAddress, 'market_sale');
    if (executorError) return executorError;
    if (!isOnechainObjectId(input.saleListingObjectId)) {
      return { success: false, kind: 'market_sale', error: 'Invalid sale listing object id.' };
    }

    const tx = new Transaction();
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.cancelSaleListing,
      arguments: [tx.object(input.saleListingObjectId)],
    });
    const execution = await executor!.execute(tx);
    return baseSuccessResult(
      'market_sale',
      execution?.digest,
      ONECHAIN_ENTRY_TARGETS.cancelSaleListing,
      0,
      parseGasFeeOne(execution),
    );
  } catch (error: any) {
    return { success: false, kind: 'market_sale', error: error?.message || 'Failed to cancel sale listing.' };
  }
}

export async function listInventoryForRent(
  input: ListRentalInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.lenderAddress, 'market_rent');
    if (executorError) return executorError;
    if (!isOnechainObjectId(input.inventoryNftObjectId)) {
      return { success: false, kind: 'market_rent', error: 'Invalid Inventory NFT object id.' };
    }
    if (input.rentPriceOne <= 0 || input.collateralOne < 0) {
      return { success: false, kind: 'market_rent', error: 'Invalid rent or collateral amount.' };
    }
    if (!Number.isInteger(input.durationMs) || input.durationMs <= 0) {
      return { success: false, kind: 'market_rent', error: 'Invalid rental duration.' };
    }

    const tx = new Transaction();
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.listInventoryForRent,
      arguments: [
        tx.object(input.inventoryNftObjectId),
        tx.pure.u64(oneToMist(input.rentPriceOne)),
        tx.pure.u64(oneToMist(input.collateralOne)),
        tx.pure.u64(input.durationMs),
        tx.object(ONECHAIN_CLOCK_OBJECT_ID),
      ],
    });

    const execution = await executor!.execute(tx);
    return {
      ...baseSuccessResult(
        'market_rent',
        execution?.digest,
        ONECHAIN_ENTRY_TARGETS.listInventoryForRent,
        0,
        parseGasFeeOne(execution),
      ),
      objectId: extractCreatedObjectId(execution, '::RentalListing'),
    };
  } catch (error: any) {
    return { success: false, kind: 'market_rent', error: error?.message || 'Failed to list NFT for rent.' };
  }
}

export async function startRental(
  input: StartRentalInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.renterAddress, 'market_rent');
    if (executorError) return executorError;
    if (!isOnechainObjectId(input.rentalListingObjectId)) {
      return { success: false, kind: 'market_rent', error: 'Invalid rental listing object id.' };
    }
    if (input.rentPriceOne <= 0 || input.collateralOne < 0) {
      return { success: false, kind: 'market_rent', error: 'Invalid rent or collateral amount.' };
    }

    const paymentOne = input.rentPriceOne + input.collateralOne;
    const tx = new Transaction();
    const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(oneToMist(paymentOne))]);
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.startRental,
      arguments: [
        tx.object(ONECHAIN_CONTRACT_META.registryObjectId),
        tx.object(input.rentalListingObjectId),
        paymentCoin,
        tx.object(ONECHAIN_CLOCK_OBJECT_ID),
      ],
    });

    const execution = await executor!.execute(tx);
    return baseSuccessResult(
      'market_rent',
      execution?.digest,
      ONECHAIN_ENTRY_TARGETS.startRental,
      paymentOne,
      parseGasFeeOne(execution),
    );
  } catch (error: any) {
    return { success: false, kind: 'market_rent', error: error?.message || 'Failed to start rental.' };
  }
}

export async function returnRental(
  input: ReturnRentalInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.renterAddress, 'market_rent');
    if (executorError) return executorError;
    if (!isOnechainObjectId(input.rentalListingObjectId)) {
      return { success: false, kind: 'market_rent', error: 'Invalid rental listing object id.' };
    }

    const tx = new Transaction();
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.returnRental,
      arguments: [tx.object(input.rentalListingObjectId)],
    });
    const execution = await executor!.execute(tx);
    return baseSuccessResult(
      'market_rent',
      execution?.digest,
      ONECHAIN_ENTRY_TARGETS.returnRental,
      0,
      parseGasFeeOne(execution),
    );
  } catch (error: any) {
    return { success: false, kind: 'market_rent', error: error?.message || 'Failed to return rental.' };
  }
}

export async function claimRentalDefault(
  input: ClaimRentalDefaultInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.lenderAddress, 'market_rent');
    if (executorError) return executorError;
    if (!isOnechainObjectId(input.rentalListingObjectId)) {
      return { success: false, kind: 'market_rent', error: 'Invalid rental listing object id.' };
    }

    const tx = new Transaction();
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.claimRentalDefault,
      arguments: [
        tx.object(ONECHAIN_CONTRACT_META.registryObjectId),
        tx.object(input.rentalListingObjectId),
        tx.object(ONECHAIN_CLOCK_OBJECT_ID),
      ],
    });
    const execution = await executor!.execute(tx);
    return baseSuccessResult(
      'market_rent',
      execution?.digest,
      ONECHAIN_ENTRY_TARGETS.claimRentalDefault,
      0,
      parseGasFeeOne(execution),
    );
  } catch (error: any) {
    return { success: false, kind: 'market_rent', error: error?.message || 'Failed to claim rental default.' };
  }
}

export async function cancelRentalListing(
  input: CancelRentalInput,
  executor?: OnechainWalletExecutor,
): Promise<OneChainResult> {
  try {
    assertOnechainContractConfigured();
    const executorError = ensureExecutor(executor, input.lenderAddress, 'market_rent');
    if (executorError) return executorError;
    if (!isOnechainObjectId(input.rentalListingObjectId)) {
      return { success: false, kind: 'market_rent', error: 'Invalid rental listing object id.' };
    }

    const tx = new Transaction();
    tx.moveCall({
      target: ONECHAIN_ENTRY_TARGETS.cancelRentalListing,
      arguments: [tx.object(input.rentalListingObjectId)],
    });
    const execution = await executor!.execute(tx);
    return baseSuccessResult(
      'market_rent',
      execution?.digest,
      ONECHAIN_ENTRY_TARGETS.cancelRentalListing,
      0,
      parseGasFeeOne(execution),
    );
  } catch (error: any) {
    return { success: false, kind: 'market_rent', error: error?.message || 'Failed to cancel rental listing.' };
  }
}

export async function consumeAdventureDiceRoll(
  sessionId: number,
  sides: number,
  playerAddress: string,
): Promise<DiceConsumeResult> {
  try {
    const response = await fetch(`${SERVER_URL}/api/adventure/session/${sessionId}/roll/player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sides, playerAddress }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.success) {
      return {
        success: false,
        error: payload?.error || payload?.details || 'Failed to consume a dice roll from relayer.',
      };
    }

    return {
      success: true,
      roll: Number(payload.roll?.roll),
      relayerTxHash: payload.roll?.relayerTxHash,
      remainingRolls: Number(payload.roll?.remainingRolls),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to consume a dice roll from relayer.',
    };
  }
}
