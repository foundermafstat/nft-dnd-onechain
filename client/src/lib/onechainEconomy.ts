const readNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const HERO_MINT_FEE_ONE = readNumber(process.env.NEXT_PUBLIC_HERO_SBT_MINT_FEE_ONE, 0.25);
export const HERO_MINT_GAS_BUFFER_ONE = 0.03;

export const ADVENTURE_ENTRY_FEE_ONE = readNumber(process.env.NEXT_PUBLIC_ADVENTURE_ENTRY_FEE_ONE, 0.12);
export const GENERATION_FEE_ONE = readNumber(process.env.NEXT_PUBLIC_GENERATION_FEE_ONE, 0.04);
export const NFT_MINT_RESERVE_ONE = readNumber(process.env.NEXT_PUBLIC_NFT_MINT_RESERVE_ONE, 0.08);
export const ADVENTURE_GAS_BUFFER_ONE = 0.03;

export interface AdventurePrepayInput {
  generationCount: number;
  mintableDropsEstimate: number;
}

export interface AdventurePrepayQuote {
  entryFeeOne: number;
  generationFeeOne: number;
  mintReserveOne: number;
  gasBufferOne: number;
  totalOne: number;
}

const round6 = (value: number) => Number(value.toFixed(6));

export function quoteHeroMintCost() {
  return {
    mintFeeOne: HERO_MINT_FEE_ONE,
    gasBufferOne: HERO_MINT_GAS_BUFFER_ONE,
    totalOne: round6(HERO_MINT_FEE_ONE + HERO_MINT_GAS_BUFFER_ONE),
  };
}

export function quoteAdventurePrepay(input: AdventurePrepayInput): AdventurePrepayQuote {
  const generationFeeOne = Math.max(0, input.generationCount) * GENERATION_FEE_ONE;
  const mintReserveOne = Math.max(0, input.mintableDropsEstimate) * NFT_MINT_RESERVE_ONE;
  const totalOne = ADVENTURE_ENTRY_FEE_ONE + generationFeeOne + mintReserveOne + ADVENTURE_GAS_BUFFER_ONE;

  return {
    entryFeeOne: ADVENTURE_ENTRY_FEE_ONE,
    generationFeeOne: round6(generationFeeOne),
    mintReserveOne: round6(mintReserveOne),
    gasBufferOne: ADVENTURE_GAS_BUFFER_ONE,
    totalOne: round6(totalOne),
  };
}
