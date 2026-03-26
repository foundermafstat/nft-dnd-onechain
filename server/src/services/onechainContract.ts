import {
    buildOnechainEntryTargets,
    isOnechainObjectId,
    normalizeOnechainHex,
    type OnechainContractMeta,
    type OnechainEntryTargets,
} from 'shared';

const DEFAULT_RPC = 'https://rpc-testnet.onelabs.cc:443';
const DEFAULT_NETWORK = 'testnet';
const DEFAULT_TESTNET_PACKAGE_ID = '0x8cca22099fe19bd90cbed43fb2573a90f8bc43100f1d639bc4bee93486c833b7';
const DEFAULT_TESTNET_REGISTRY_ID = '0xdd2a58cbcd10e71b186cf8779a1f4e360c4a385fa2548a8dda51922d5e20d833';
const DEFAULT_TESTNET_ADMIN_CAP_ID = '0x20fc57100cdb9043f65b69133426f768b822048dcbd2314e36f4532a71d9f7d2';
const DEFAULT_TESTNET_UPGRADE_CAP_ID = '0xac4c55600a7622bc0164ec950a7bb3b6853337656ad92c421fd8f7a8e798077a';
const DEFAULT_DEPLOY_TX_DIGEST = '4mVpabfsJptzT4iuTjCgvJgnkUgtSN5BJd3d29QamZKy';

const packageId = normalizeOnechainHex(process.env.ONECHAIN_PACKAGE_ID || DEFAULT_TESTNET_PACKAGE_ID);
const registryObjectId = normalizeOnechainHex(process.env.ONECHAIN_REGISTRY_ID || DEFAULT_TESTNET_REGISTRY_ID);
const adminCapId = normalizeOnechainHex(process.env.ONECHAIN_ADMIN_CAP_ID || DEFAULT_TESTNET_ADMIN_CAP_ID);
const upgradeCapId = normalizeOnechainHex(process.env.ONECHAIN_UPGRADE_CAP_ID || DEFAULT_TESTNET_UPGRADE_CAP_ID);

export const onechainContractMeta: OnechainContractMeta = {
    network: process.env.ONECHAIN_NETWORK || DEFAULT_NETWORK,
    rpcUrl: process.env.ONECHAIN_RPC_URL || DEFAULT_RPC,
    packageId,
    registryObjectId,
    adminCapId,
    upgradeCapId,
    moduleName: 'registry',
    deployTxDigest: process.env.ONECHAIN_DEPLOY_TX_DIGEST || DEFAULT_DEPLOY_TX_DIGEST,
};

export const onechainEntryTargets: OnechainEntryTargets = buildOnechainEntryTargets(
    onechainContractMeta.packageId,
    onechainContractMeta.moduleName,
);

export function isOnechainContractConfigured(meta: OnechainContractMeta = onechainContractMeta): boolean {
    return isOnechainObjectId(meta.packageId) && isOnechainObjectId(meta.registryObjectId);
}
