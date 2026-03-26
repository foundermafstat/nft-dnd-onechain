export interface OnechainContractMeta {
    network: string;
    rpcUrl: string;
    packageId: string;
    registryObjectId: string;
    adminCapId?: string;
    upgradeCapId?: string;
    moduleName: string;
    deployTxDigest?: string;
}

export interface OnechainEntryTargets {
    mintHeroSbt: string;
    burnHeroSbt: string;
    updateHeroProgress: string;
    startAdventureAndPrepay: string;
    closeAdventureAndRefund: string;
    createGroupAdventure: string;
    payGroupAdventureParticipation: string;
    cancelGroupAdventureAfterTimeout: string;
    claimGroupRefund: string;
    mintInventoryNftPaid: string;
    mintInventoryNftFromPrepay: string;
    listInventoryForSale: string;
    buySaleListing: string;
    cancelSaleListing: string;
    listInventoryForRent: string;
    startRental: string;
    returnRental: string;
    claimRentalDefault: string;
    cancelRentalListing: string;
    createAdventureDicePacks: string;
    consumeDicepackRoll: string;
}

const HEX_0X_64 = /^0x[0-9a-f]{64}$/i;

export function isOnechainObjectId(value: string): boolean {
    return HEX_0X_64.test(value.trim());
}

export function normalizeOnechainHex(value: string): string {
    const normalized = value.trim().toLowerCase();
    return normalized.startsWith('0x') ? normalized : `0x${normalized}`;
}

export function buildOnechainEntryTargets(
    packageId: string,
    moduleName = 'registry',
): OnechainEntryTargets {
    const base = `${normalizeOnechainHex(packageId)}::${moduleName}`;
    return {
        mintHeroSbt: `${base}::mint_hero_sbt`,
        burnHeroSbt: `${base}::burn_hero_sbt`,
        updateHeroProgress: `${base}::update_hero_progress`,
        startAdventureAndPrepay: `${base}::start_adventure_and_prepay`,
        closeAdventureAndRefund: `${base}::close_adventure_and_refund`,
        createGroupAdventure: `${base}::create_group_adventure`,
        payGroupAdventureParticipation: `${base}::pay_group_adventure_participation`,
        cancelGroupAdventureAfterTimeout: `${base}::cancel_group_adventure_after_timeout`,
        claimGroupRefund: `${base}::claim_group_refund`,
        mintInventoryNftPaid: `${base}::mint_inventory_nft_paid`,
        mintInventoryNftFromPrepay: `${base}::mint_inventory_nft_from_prepay`,
        listInventoryForSale: `${base}::list_inventory_for_sale`,
        buySaleListing: `${base}::buy_sale_listing`,
        cancelSaleListing: `${base}::cancel_sale_listing`,
        listInventoryForRent: `${base}::list_inventory_for_rent`,
        startRental: `${base}::start_rental`,
        returnRental: `${base}::return_rental`,
        claimRentalDefault: `${base}::claim_rental_default`,
        cancelRentalListing: `${base}::cancel_rental_listing`,
        createAdventureDicePacks: `${base}::create_adventure_dice_packs`,
        consumeDicepackRoll: `${base}::consume_dicepack_roll`,
    };
}
