import { quoteAdventurePrepay, quoteHeroMintCost, type AdventurePrepayInput } from '@/lib/onechainEconomy';
import { SERVER_URL } from '@/lib/config';
import type { HeroSbtSnapshot } from '@/lib/shadowdarkSbt';

type TxKind =
  | 'hero_sbt_mint'
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
  paidOne?: number;
  gasFeeOne?: number;
  error?: string;
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

export interface DiceConsumeResult {
  success: boolean;
  roll?: number;
  relayerTxHash?: string;
  remainingRolls?: number;
  error?: string;
}

const txHash = (kind: TxKind, playerAddress: string, suffix: string | number) =>
  `onechain-${kind}-${playerAddress.slice(0, 6)}-${suffix}`;

/**
 * Placeholder transaction helper.
 * Replace with real OneChain PTB execution when contract ids are available.
 */
async function simulateTx(
  kind: TxKind,
  playerAddress: string,
  paidOne: number,
  gasFeeOne: number,
  sessionId?: number,
): Promise<OneChainResult> {
  const suffix = sessionId ?? Date.now();
  return {
    success: true,
    kind,
    hash: txHash(kind, playerAddress, suffix),
    sessionId,
    paidOne: Number(paidOne.toFixed(6)),
    gasFeeOne: Number(gasFeeOne.toFixed(6)),
  };
}

export async function mintHeroSBT(input: HeroMintInput): Promise<OneChainResult> {
  try {
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

    const quote = quoteHeroMintCost();
    return await simulateTx('hero_sbt_mint', input.playerAddress, quote.totalOne, quote.gasBufferOne);
  } catch (error: any) {
    console.error('Error minting hero SBT on OneChain:', error);
    return {
      success: false,
      kind: 'hero_sbt_mint',
      error: error?.message || 'Failed to mint hero SBT on OneChain',
    };
  }
}

export async function startAdventureWithPrepay(input: StartAdventureInput): Promise<OneChainResult> {
  try {
    if (!input.playerAddress) {
      return { success: false, kind: 'adventure_prepay', error: 'Wallet address is required.' };
    }

    const quote = quoteAdventurePrepay({
      generationCount: input.generationCount,
      mintableDropsEstimate: input.mintableDropsEstimate,
    });
    const response = await fetch(`${SERVER_URL}/api/adventure/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerAddress: input.playerAddress,
        playerRollsCount: input.playerRollsCount ?? 64,
        aiRollsCount: input.aiRollsCount ?? 64,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody?.error || 'Failed to initialize adventure dice packs');
    }

    const payload = await response.json();
    const sessionId = Number(payload?.session?.sessionId);
    if (!Number.isInteger(sessionId)) {
      throw new Error('Adventure session id is missing');
    }

    return await simulateTx(
      'adventure_prepay',
      input.playerAddress,
      quote.totalOne,
      quote.gasBufferOne,
      sessionId,
    );
  } catch (error: any) {
    console.error('Error starting adventure on OneChain:', error);
    return {
      success: false,
      kind: 'adventure_prepay',
      error: error?.message || 'Failed to start adventure on OneChain',
    };
  }
}

export async function mintInventoryNFT(playerAddress: string): Promise<OneChainResult> {
  try {
    return await simulateTx('inventory_nft_mint', playerAddress, 0.08, 0.02);
  } catch (error: any) {
    return { success: false, kind: 'inventory_nft_mint', error: error?.message || 'Mint failed' };
  }
}

export async function endGame(
  playerAddress: string,
  sessionId: number | string | null,
): Promise<OneChainResult> {
  try {
    if (typeof sessionId === 'number') {
      const finalizeResponse = await fetch(`${SERVER_URL}/api/adventure/session/${sessionId}/finalize`, {
        method: 'POST',
      });
      if (!finalizeResponse.ok) {
        const errorBody = await finalizeResponse.json().catch(() => ({}));
        throw new Error(errorBody?.error || 'Failed to finalize adventure dice session');
      }
    }

    return await simulateTx(
      'adventure_finalize',
      playerAddress,
      0,
      0.02,
      typeof sessionId === 'number' ? sessionId : undefined,
    );
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
  options: Partial<AdventurePrepayInput> & { playerRollsCount?: number; aiRollsCount?: number } = {},
): Promise<OneChainResult> {
  return startAdventureWithPrepay({
    playerAddress,
    generationCount: options.generationCount ?? 3,
    mintableDropsEstimate: options.mintableDropsEstimate ?? 1,
    playerRollsCount: options.playerRollsCount ?? 64,
    aiRollsCount: options.aiRollsCount ?? 64,
  });
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
