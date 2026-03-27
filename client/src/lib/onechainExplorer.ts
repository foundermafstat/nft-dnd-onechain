const DEFAULT_ONECHAIN_TESTNET_EXPLORER_TX_BASE =
  'https://onescan.cc/testnet/transactionBlocksDetail?digest=';

export const ONECHAIN_EXPLORER_TX_BASE =
  process.env.NEXT_PUBLIC_ONECHAIN_EXPLORER_TX_BASE || DEFAULT_ONECHAIN_TESTNET_EXPLORER_TX_BASE;

export function buildTxExplorerUrl(txHash?: string | null): string | null {
  const raw = String(txHash || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${ONECHAIN_EXPLORER_TX_BASE}${encodeURIComponent(raw)}`;
}

