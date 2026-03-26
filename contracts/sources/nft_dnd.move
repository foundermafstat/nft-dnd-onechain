module nft_dnd::registry;

use std::string::String;

public struct Registry has key {
    id: object::UID,
    items_minted: u64,
    badges_issued: u64,
}

public struct LegendaryItem has key, store {
    id: object::UID,
    name: String,
    rarity_tier: u8,
    ipfs_cid: String,
    ai_lore: String,
}

public struct ChronicleBadge has key, store {
    id: object::UID,
    title: String,
    event_summary: String,
}

fun init(ctx: &mut TxContext) {
    let registry = Registry {
        id: object::new(ctx),
        items_minted: 0,
        badges_issued: 0,
    };

    transfer::transfer(registry, ctx.sender());
}

public fun items_minted(self: &Registry): u64 {
    self.items_minted
}

public fun badges_issued(self: &Registry): u64 {
    self.badges_issued
}

public entry fun mint_legendary_item(
    registry: &mut Registry,
    recipient: address,
    name: String,
    rarity_tier: u8,
    ipfs_cid: String,
    ai_lore: String,
    ctx: &mut TxContext
) {
    registry.items_minted = registry.items_minted + 1;

    let item = LegendaryItem {
        id: object::new(ctx),
        name,
        rarity_tier,
        ipfs_cid,
        ai_lore,
    };

    transfer::public_transfer(item, recipient);
}

public entry fun issue_chronicle_badge(
    registry: &mut Registry,
    recipient: address,
    title: String,
    event_summary: String,
    ctx: &mut TxContext
) {
    registry.badges_issued = registry.badges_issued + 1;

    let badge = ChronicleBadge {
        id: object::new(ctx),
        title,
        event_summary,
    };

    transfer::public_transfer(badge, recipient);
}
