import {
  buildOnechainEntryTargets,
  isOnechainObjectId,
  normalizeOnechainHex,
  type OnechainContractMeta,
  type OnechainEntryTargets,
} from 'shared';
import { ONECHAIN_NETWORK, ONECHAIN_RPC_URL, SERVER_URL } from '@/lib/config';

const DEFAULT_TESTNET_PACKAGE_ID = '0x8cca22099fe19bd90cbed43fb2573a90f8bc43100f1d639bc4bee93486c833b7';
const DEFAULT_TESTNET_REGISTRY_ID = '0xdd2a58cbcd10e71b186cf8779a1f4e360c4a385fa2548a8dda51922d5e20d833';
const DEFAULT_TESTNET_ADMIN_CAP_ID = '0x20fc57100cdb9043f65b69133426f768b822048dcbd2314e36f4532a71d9f7d2';
const DEFAULT_TESTNET_UPGRADE_CAP_ID = '0xac4c55600a7622bc0164ec950a7bb3b6853337656ad92c421fd8f7a8e798077a';
const DEFAULT_DEPLOY_TX_DIGEST = '4mVpabfsJptzT4iuTjCgvJgnkUgtSN5BJd3d29QamZKy';

const packageId = normalizeOnechainHex(
  process.env.NEXT_PUBLIC_ONECHAIN_PACKAGE_ID || DEFAULT_TESTNET_PACKAGE_ID,
);
const registryObjectId = normalizeOnechainHex(
  process.env.NEXT_PUBLIC_ONECHAIN_REGISTRY_ID || DEFAULT_TESTNET_REGISTRY_ID,
);
const adminCapId = normalizeOnechainHex(
  process.env.NEXT_PUBLIC_ONECHAIN_ADMIN_CAP_ID || DEFAULT_TESTNET_ADMIN_CAP_ID,
);
const upgradeCapId = normalizeOnechainHex(
  process.env.NEXT_PUBLIC_ONECHAIN_UPGRADE_CAP_ID || DEFAULT_TESTNET_UPGRADE_CAP_ID,
);

export const ONECHAIN_CONTRACT_META: OnechainContractMeta = {
  network: ONECHAIN_NETWORK,
  rpcUrl: ONECHAIN_RPC_URL,
  packageId,
  registryObjectId,
  adminCapId,
  upgradeCapId,
  moduleName: 'registry',
  deployTxDigest: process.env.NEXT_PUBLIC_ONECHAIN_DEPLOY_TX_DIGEST || DEFAULT_DEPLOY_TX_DIGEST,
};

export const ONECHAIN_ENTRY_TARGETS: OnechainEntryTargets = buildOnechainEntryTargets(
  ONECHAIN_CONTRACT_META.packageId,
  ONECHAIN_CONTRACT_META.moduleName,
);

export function isOnechainContractConfigured(meta = ONECHAIN_CONTRACT_META): boolean {
  return isOnechainObjectId(meta.packageId) && isOnechainObjectId(meta.registryObjectId);
}

export function assertOnechainContractConfigured(meta = ONECHAIN_CONTRACT_META): void {
  if (!isOnechainContractConfigured(meta)) {
    throw new Error(
      'OneChain contract ids are not configured. Set NEXT_PUBLIC_ONECHAIN_PACKAGE_ID and NEXT_PUBLIC_ONECHAIN_REGISTRY_ID.',
    );
  }
}

export async function fetchOnechainContractMetaFromServer(): Promise<{
  configured: boolean;
  contract: OnechainContractMeta;
  targets: OnechainEntryTargets;
}> {
  const response = await fetch(`${SERVER_URL}/api/onechain/contract`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Failed to load OneChain contract metadata from server.');
  }
  return {
    configured: Boolean(payload.configured),
    contract: payload.contract as OnechainContractMeta,
    targets: payload.targets as OnechainEntryTargets,
  };
}
