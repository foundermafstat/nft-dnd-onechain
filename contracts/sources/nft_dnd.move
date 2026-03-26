module nft_dnd::registry;

use std::bcs;
use std::string::String;
use one::balance::{Self, Balance};
use one::clock::{Self, Clock};
use one::coin::{Self, Coin};
use one::event;
use one::hash;
use one::oct::OCT;
use one::table::{Self, Table};

const E_NOT_ADMIN: u64 = 1;
const E_NOT_OWNER: u64 = 2;
const E_ALREADY_HAS_HERO: u64 = 3;
const E_INSUFFICIENT_PAYMENT: u64 = 5;
const E_LISTING_INACTIVE: u64 = 6;
const E_INVALID_PRICE: u64 = 7;
const E_INVALID_DURATION: u64 = 8;
const E_ALREADY_RENTED: u64 = 9;
const E_NOT_RENTER: u64 = 10;
const E_NOT_LENDER: u64 = 11;
const E_RENT_NOT_EXPIRED: u64 = 12;
const E_ESCROW_NOT_FOUND: u64 = 13;
const E_ESCROW_NOT_OWNER: u64 = 14;
const E_ESCROW_BUDGET_EXCEEDED: u64 = 15;
const E_INVALID_FEE_BPS: u64 = 16;
const E_SELF_PURCHASE: u64 = 17;
const E_LISTING_ALREADY_FINALIZED: u64 = 18;
const E_INVALID_COMMITMENT: u64 = 19;
const E_DICE_ALREADY_REVEALED: u64 = 20;
const E_DICE_NOT_READY: u64 = 21;
const E_DICE_ALREADY_RESOLVED: u64 = 22;
const E_INVALID_DICE_SIDES: u64 = 23;
const E_DICEPACK_EMPTY: u64 = 24;
const E_INVALID_DICE_ROOT: u64 = 26;
const E_DICEPACK_ALREADY_EXHAUSTED: u64 = 27;
const E_GROUP_NOT_FOUND: u64 = 28;
const E_GROUP_NOT_OPEN: u64 = 29;
const E_GROUP_PAYMENT_WINDOW_CLOSED: u64 = 30;
const E_GROUP_NOT_PARTICIPANT: u64 = 31;
const E_GROUP_ALREADY_PAID: u64 = 32;
const E_GROUP_DUPLICATE_PARTICIPANT: u64 = 33;
const E_GROUP_INVALID_PARTICIPANTS: u64 = 34;
const E_GROUP_NOT_CANCELLED: u64 = 35;
const E_GROUP_NO_REFUND: u64 = 36;
const E_GROUP_NOT_EXPIRED: u64 = 37;
const E_GROUP_NOT_SETTLED: u64 = 38;
const E_GROUP_UNAUTHORIZED: u64 = 39;
const E_INVALID_HERO_STAT: u64 = 40;

const DICEPACK_ROLE_PLAYER: u8 = 0;
const DICEPACK_ROLE_AI: u8 = 1;
const GROUP_STATUS_OPEN: u8 = 0;
const GROUP_STATUS_STARTED: u8 = 1;
const GROUP_STATUS_CANCELLED: u8 = 2;

const MAX_BPS: u64 = 10_000;

public struct AdminCap has key, store {
    id: object::UID,
}

/// Shared control object for fees, treasury and counters.
public struct Registry has key {
    id: object::UID,
    admin: address,

    hero_sbt_mint_fee_mist: u64,
    adventure_entry_fee_mist: u64,
    generation_fee_mist: u64,
    nft_mint_reserve_mist: u64,
    market_fee_bps: u64,

    total_hero_sbt_minted: u64,
    total_inventory_nft_minted: u64,
    total_adventures_started: u64,
    total_market_volume_mist: u64,

    next_adventure_id: u64,
    next_group_adventure_id: u64,

    treasury: Balance<OCT>,
    hero_by_owner: Table<address, bool>,
    adventure_escrows: Table<u64, AdventureEscrow>,
    group_adventures: Table<u64, GroupAdventure>,
}

/// Non-transferable character identity token.
public struct HeroSBT has key {
    id: object::UID,
    owner: address,
    hero_name: String,
    hero_class: String,
    ancestry: String,
    alignment: String,
    deity: String,
    title: String,
    background: String,
    stat_str: u8,
    stat_dex: u8,
    stat_con: u8,
    stat_int: u8,
    stat_wis: u8,
    stat_cha: u8,
    hp_max: u64,
    armor_class: u64,
    starting_gold_gp: u64,
    gear_slots: u64,
    languages_csv: String,
    talents_csv: String,
    known_spells_csv: String,
    origin_lore_cid: String,
    portrait_cid: String,
    hero_sheet_cid: String,
    ruleset_id: String,
    created_at_ms: u64,
    level: u64,
    xp: u64,
    lore_score: u64,
}

/// Transferable item token.
public struct InventoryNFT has key, store {
    id: object::UID,
    creator: address,
    owner: address,
    name: String,
    rarity_tier: u8,
    metadata_cid: String,
    lore_cid: String,
    minted_at_ms: u64,
}

public struct SaleListing has key, store {
    id: object::UID,
    seller: address,
    price_mist: u64,
    listed_at_ms: u64,
    sold_price_mist: u64,
    active: bool,
    buyer: option::Option<address>,
    item: option::Option<InventoryNFT>,
}

public struct RentalListing has key, store {
    id: object::UID,
    lender: address,
    rent_price_mist: u64,
    collateral_mist: u64,
    duration_ms: u64,
    listed_at_ms: u64,
    rental_started_at_ms: u64,
    rental_ends_at_ms: u64,
    active: bool,
    renter: option::Option<address>,
    collateral_vault: Balance<OCT>,
    item: option::Option<InventoryNFT>,
}

/// Non-transferable proof that renter has temporary usage rights.
public struct RentalPermit has key {
    id: object::UID,
    listing_id: object::ID,
    nft_id: object::ID,
    renter: address,
    expires_at_ms: u64,
}

public struct AdventureEscrow has store {
    player: address,
    started_at_ms: u64,
    generation_count: u64,
    mintable_drops_estimate: u64,
    total_prepaid_mist: u64,
    vault: Balance<OCT>,
}

/// Group participation lockbox with payment deadline guard.
public struct GroupAdventure has store {
    leader: address,
    participants: vector<address>,
    per_player_contribution_mist: u64,
    created_at_ms: u64,
    deadline_ms: u64,
    status: u8,
    started_adventure_id: u64,
    paid_amounts_mist: vector<u64>,
    total_paid_mist: u64,
    vault: Balance<OCT>,
}

/// Commit-reveal structure for fair dice.
public struct DiceSession has key, store {
    id: object::UID,
    adventure_id: u64,
    player: address,
    sides: u8,
    player_commitment: vector<u8>,
    server_commitment: vector<u8>,
    player_revealed: bool,
    server_revealed: bool,
    resolved: bool,
    result: u8,
    created_at_ms: u64,
}

/// Prepaid roll pack. Only merkle root is stored on-chain; rolls stay hidden off-chain.
public struct DicePack has key, store {
    id: object::UID,
    adventure_id: u64,
    owner: address,
    role: u8,
    total_rolls: u64,
    used_rolls: u64,
    merkle_root: vector<u8>,
    exhausted: bool,
    created_at_ms: u64,
}

public struct HeroMinted has copy, drop {
    owner: address,
    hero_id: object::ID,
    fee_paid_mist: u64,
}

public struct InventoryMinted has copy, drop {
    owner: address,
    nft_id: object::ID,
    adventure_id: u64,
}

public struct AdventureStarted has copy, drop {
    adventure_id: u64,
    player: address,
    total_prepaid_mist: u64,
}

public struct AdventureClosed has copy, drop {
    adventure_id: u64,
    player: address,
    refund_mist: u64,
}

public struct GroupAdventureCreated has copy, drop {
    group_id: u64,
    leader: address,
    participant_count: u64,
    per_player_contribution_mist: u64,
    deadline_ms: u64,
}

public struct GroupAdventurePaymentReceived has copy, drop {
    group_id: u64,
    payer: address,
    amount_mist: u64,
    paid_count: u64,
    participant_count: u64,
}

public struct GroupAdventureStarted has copy, drop {
    group_id: u64,
    adventure_id: u64,
    participant_count: u64,
    total_locked_mist: u64,
}

public struct GroupAdventureCancelled has copy, drop {
    group_id: u64,
    cancelled_by: address,
    total_locked_mist: u64,
}

public struct GroupAdventureRefundClaimed has copy, drop {
    group_id: u64,
    player: address,
    amount_mist: u64,
    remaining_locked_mist: u64,
}

public struct SalePurchased has copy, drop {
    listing_id: object::ID,
    nft_id: object::ID,
    seller: address,
    buyer: address,
    price_mist: u64,
}

public struct RentalStarted has copy, drop {
    listing_id: object::ID,
    nft_id: object::ID,
    lender: address,
    renter: address,
    rental_ends_at_ms: u64,
}

public struct RentalReturned has copy, drop {
    listing_id: object::ID,
    nft_id: object::ID,
    lender: address,
    renter: address,
}

public struct RentalDefaultClaimed has copy, drop {
    listing_id: object::ID,
    nft_id: object::ID,
    lender: address,
    renter: address,
}

public struct DiceSessionResolved has copy, drop {
    session_id: object::ID,
    adventure_id: u64,
    player: address,
    result: u8,
}

public struct DicePackCreated has copy, drop {
    adventure_id: u64,
    pack_id: object::ID,
    owner: address,
    role: u8,
    total_rolls: u64,
    merkle_root: vector<u8>,
}

public struct DicePackRollConsumed has copy, drop {
    adventure_id: u64,
    pack_id: object::ID,
    owner: address,
    role: u8,
    roll_index: u64,
    sides: u8,
    roll_value: u8,
    remaining_rolls: u64,
    relayed_by: address,
}

fun init(ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);

    let admin_cap = AdminCap {
        id: object::new(ctx),
    };

    let registry = Registry {
        id: object::new(ctx),
        admin: sender,

        hero_sbt_mint_fee_mist: 250_000_000, // 0.25 OCT
        adventure_entry_fee_mist: 120_000_000, // 0.12 OCT
        generation_fee_mist: 40_000_000, // 0.04 OCT
        nft_mint_reserve_mist: 80_000_000, // 0.08 OCT
        market_fee_bps: 250, // 2.5%

        total_hero_sbt_minted: 0,
        total_inventory_nft_minted: 0,
        total_adventures_started: 0,
        total_market_volume_mist: 0,

        next_adventure_id: 1,
        next_group_adventure_id: 1,

        treasury: balance::zero(),
        hero_by_owner: table::new(ctx),
        adventure_escrows: table::new(ctx),
        group_adventures: table::new(ctx),
    };

    transfer::transfer(admin_cap, sender);
    transfer::share_object(registry);
}

// ─────────────────────────────────────────────────────────────────────────────
// View helpers
// ─────────────────────────────────────────────────────────────────────────────

public fun hero_sbt_mint_fee_mist(self: &Registry): u64 {
    self.hero_sbt_mint_fee_mist
}

public fun adventure_entry_fee_mist(self: &Registry): u64 {
    self.adventure_entry_fee_mist
}

public fun generation_fee_mist(self: &Registry): u64 {
    self.generation_fee_mist
}

public fun nft_mint_reserve_mist(self: &Registry): u64 {
    self.nft_mint_reserve_mist
}

public fun market_fee_bps(self: &Registry): u64 {
    self.market_fee_bps
}

public fun treasury_balance_mist(self: &Registry): u64 {
    balance::value(&self.treasury)
}

public fun total_hero_sbt_minted(self: &Registry): u64 {
    self.total_hero_sbt_minted
}

public fun total_inventory_nft_minted(self: &Registry): u64 {
    self.total_inventory_nft_minted
}

public fun total_adventures_started(self: &Registry): u64 {
    self.total_adventures_started
}

public fun total_market_volume_mist(self: &Registry): u64 {
    self.total_market_volume_mist
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin operations
// ─────────────────────────────────────────────────────────────────────────────

public entry fun update_fee_config(
    registry: &mut Registry,
    admin_cap: &AdminCap,
    hero_sbt_mint_fee_mist: u64,
    adventure_entry_fee_mist: u64,
    generation_fee_mist: u64,
    nft_mint_reserve_mist: u64,
    market_fee_bps: u64,
    ctx: &TxContext,
) {
    let _ = admin_cap;
    assert_admin(registry, ctx);
    assert!(market_fee_bps <= MAX_BPS, E_INVALID_FEE_BPS);

    registry.hero_sbt_mint_fee_mist = hero_sbt_mint_fee_mist;
    registry.adventure_entry_fee_mist = adventure_entry_fee_mist;
    registry.generation_fee_mist = generation_fee_mist;
    registry.nft_mint_reserve_mist = nft_mint_reserve_mist;
    registry.market_fee_bps = market_fee_bps;
}

public entry fun withdraw_treasury(
    registry: &mut Registry,
    admin_cap: &AdminCap,
    amount_mist: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    let _ = admin_cap;
    assert_admin(registry, ctx);
    let payout = balance::split(&mut registry.treasury, amount_mist);
    transfer::public_transfer(coin::from_balance(payout, ctx), recipient);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero SBT
// ─────────────────────────────────────────────────────────────────────────────

public entry fun mint_hero_sbt(
    registry: &mut Registry,
    payment: Coin<OCT>,
    hero_name: String,
    hero_class: String,
    ancestry: String,
    alignment: String,
    deity: String,
    title: String,
    background: String,
    stat_str: u8,
    stat_dex: u8,
    stat_con: u8,
    stat_int: u8,
    stat_wis: u8,
    stat_cha: u8,
    hp_max: u64,
    armor_class: u64,
    starting_gold_gp: u64,
    gear_slots: u64,
    languages_csv: String,
    talents_csv: String,
    known_spells_csv: String,
    origin_lore_cid: String,
    portrait_cid: String,
    hero_sheet_cid: String,
    ruleset_id: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    assert!(!table::contains(&registry.hero_by_owner, sender), E_ALREADY_HAS_HERO);
    assert!(stat_str >= 3 && stat_str <= 18, E_INVALID_HERO_STAT);
    assert!(stat_dex >= 3 && stat_dex <= 18, E_INVALID_HERO_STAT);
    assert!(stat_con >= 3 && stat_con <= 18, E_INVALID_HERO_STAT);
    assert!(stat_int >= 3 && stat_int <= 18, E_INVALID_HERO_STAT);
    assert!(stat_wis >= 3 && stat_wis <= 18, E_INVALID_HERO_STAT);
    assert!(stat_cha >= 3 && stat_cha <= 18, E_INVALID_HERO_STAT);

    let hero_fee = registry.hero_sbt_mint_fee_mist;
    collect_to_treasury_and_refund_change(registry, payment, hero_fee, ctx);

    let hero = HeroSBT {
        id: object::new(ctx),
        owner: sender,
        hero_name,
        hero_class,
        ancestry,
        alignment,
        deity,
        title,
        background,
        stat_str,
        stat_dex,
        stat_con,
        stat_int,
        stat_wis,
        stat_cha,
        hp_max,
        armor_class,
        starting_gold_gp,
        gear_slots,
        languages_csv,
        talents_csv,
        known_spells_csv,
        origin_lore_cid,
        portrait_cid,
        hero_sheet_cid,
        ruleset_id,
        created_at_ms: clock::timestamp_ms(clock),
        level: 1,
        xp: 0,
        lore_score: 0,
    };
    let hero_id = object::id(&hero);

    table::add(&mut registry.hero_by_owner, sender, true);
    registry.total_hero_sbt_minted = registry.total_hero_sbt_minted + 1;

    transfer::transfer(hero, sender);
    event::emit(HeroMinted {
        owner: sender,
        hero_id,
        fee_paid_mist: hero_fee,
    });
}

public entry fun burn_hero_sbt(
    registry: &mut Registry,
    hero: HeroSBT,
    ctx: &TxContext,
) {
    let sender = tx_context::sender(ctx);
    assert!(sender == hero.owner, E_NOT_OWNER);

    if (table::contains(&registry.hero_by_owner, sender)) {
        let _ = table::remove(&mut registry.hero_by_owner, sender);
    };

    let HeroSBT {
        id,
        owner: _,
        hero_name: _,
        hero_class: _,
        ancestry: _,
        alignment: _,
        deity: _,
        title: _,
        background: _,
        stat_str: _,
        stat_dex: _,
        stat_con: _,
        stat_int: _,
        stat_wis: _,
        stat_cha: _,
        hp_max: _,
        armor_class: _,
        starting_gold_gp: _,
        gear_slots: _,
        languages_csv: _,
        talents_csv: _,
        known_spells_csv: _,
        origin_lore_cid: _,
        portrait_cid: _,
        hero_sheet_cid: _,
        ruleset_id: _,
        created_at_ms: _,
        level: _,
        xp: _,
        lore_score: _,
    } = hero;
    object::delete(id);
}

public entry fun update_hero_progress(
    registry: &Registry,
    admin_cap: &AdminCap,
    hero: &mut HeroSBT,
    level_delta: u64,
    xp_delta: u64,
    lore_score_delta: u64,
    ctx: &TxContext,
) {
    let _ = admin_cap;
    assert_admin(registry, ctx);
    hero.level = hero.level + level_delta;
    hero.xp = hero.xp + xp_delta;
    hero.lore_score = hero.lore_score + lore_score_delta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adventure prepay escrow
// ─────────────────────────────────────────────────────────────────────────────

public entry fun start_adventure_and_prepay(
    registry: &mut Registry,
    payment: Coin<OCT>,
    generation_count: u64,
    mintable_drops_estimate: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    let required =
        registry.adventure_entry_fee_mist
            + generation_count * registry.generation_fee_mist
            + mintable_drops_estimate * registry.nft_mint_reserve_mist;

    let mut incoming = coin::into_balance(payment);
    assert!(balance::value(&incoming) >= required, E_INSUFFICIENT_PAYMENT);

    let locked = balance::split(&mut incoming, required);
    transfer_or_destroy_zero(incoming, sender, ctx);

    let adventure_id = registry.next_adventure_id;
    registry.next_adventure_id = registry.next_adventure_id + 1;
    registry.total_adventures_started = registry.total_adventures_started + 1;

    table::add(
        &mut registry.adventure_escrows,
        adventure_id,
        AdventureEscrow {
            player: sender,
            started_at_ms: clock::timestamp_ms(clock),
            generation_count,
            mintable_drops_estimate,
            total_prepaid_mist: required,
            vault: locked,
        },
    );

    event::emit(AdventureStarted {
        adventure_id,
        player: sender,
        total_prepaid_mist: required,
    });
}

public entry fun consume_generation_budget(
    registry: &mut Registry,
    admin_cap: &AdminCap,
    adventure_id: u64,
    generations_used: u64,
    ctx: &TxContext,
) {
    let _ = admin_cap;
    assert_admin(registry, ctx);
    assert!(table::contains(&registry.adventure_escrows, adventure_id), E_ESCROW_NOT_FOUND);

    let mut escrow = table::remove(&mut registry.adventure_escrows, adventure_id);
    let cost = generations_used * registry.generation_fee_mist;
    consume_from_escrow_to_treasury(registry, &mut escrow, cost);
    table::add(&mut registry.adventure_escrows, adventure_id, escrow);
}

public entry fun close_adventure_and_refund(
    registry: &mut Registry,
    adventure_id: u64,
    ctx: &mut TxContext,
) {
    assert!(table::contains(&registry.adventure_escrows, adventure_id), E_ESCROW_NOT_FOUND);

    let sender = tx_context::sender(ctx);
    let escrow = table::remove(&mut registry.adventure_escrows, adventure_id);
    assert!(escrow.player == sender || sender == registry.admin, E_ESCROW_NOT_OWNER);

    let AdventureEscrow {
        player,
        started_at_ms: _,
        generation_count: _,
        mintable_drops_estimate: _,
        total_prepaid_mist: _,
        vault,
    } = escrow;

    let refund_mist = balance::value(&vault);
    transfer_or_destroy_zero(vault, player, ctx);

    event::emit(AdventureClosed {
        adventure_id,
        player,
        refund_mist,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Group participation guard (payment deadline + per-user refund claim)
// ─────────────────────────────────────────────────────────────────────────────

public entry fun create_group_adventure(
    registry: &mut Registry,
    participants: vector<address>,
    per_player_contribution_mist: u64,
    timeout_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(per_player_contribution_mist > 0, E_INVALID_PRICE);
    assert!(timeout_ms > 0, E_INVALID_DURATION);

    let leader = tx_context::sender(ctx);
    let mut members = participants;
    ensure_address_in_vector(&mut members, leader);
    assert!(vector::length(&members) >= 2, E_GROUP_INVALID_PARTICIPANTS);
    assert_no_duplicate_addresses(&members);

    let member_count = vector::length(&members);
    let mut paid = vector::empty<u64>();
    let mut i = 0;
    while (i < member_count) {
        vector::push_back(&mut paid, 0);
        i = i + 1;
    };

    let created_at_ms = clock::timestamp_ms(clock);
    let group_id = registry.next_group_adventure_id;
    registry.next_group_adventure_id = registry.next_group_adventure_id + 1;

    table::add(
        &mut registry.group_adventures,
        group_id,
        GroupAdventure {
            leader,
            participants: members,
            per_player_contribution_mist,
            created_at_ms,
            deadline_ms: created_at_ms + timeout_ms,
            status: GROUP_STATUS_OPEN,
            started_adventure_id: 0,
            paid_amounts_mist: paid,
            total_paid_mist: 0,
            vault: balance::zero(),
        },
    );

    event::emit(GroupAdventureCreated {
        group_id,
        leader,
        participant_count: member_count,
        per_player_contribution_mist,
        deadline_ms: created_at_ms + timeout_ms,
    });
}

public entry fun pay_group_adventure_participation(
    registry: &mut Registry,
    group_id: u64,
    payment: Coin<OCT>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(table::contains(&registry.group_adventures, group_id), E_GROUP_NOT_FOUND);
    let sender = tx_context::sender(ctx);

    let mut group = table::remove(&mut registry.group_adventures, group_id);
    assert!(group.status == GROUP_STATUS_OPEN, E_GROUP_NOT_OPEN);
    assert!(clock::timestamp_ms(clock) <= group.deadline_ms, E_GROUP_PAYMENT_WINDOW_CLOSED);

    let member_index = find_participant_index(&group.participants, sender);
    assert!(member_index < vector::length(&group.participants), E_GROUP_NOT_PARTICIPANT);

    let current_paid = *vector::borrow(&group.paid_amounts_mist, member_index);
    assert!(current_paid == 0, E_GROUP_ALREADY_PAID);

    let required = group.per_player_contribution_mist;
    let mut incoming = coin::into_balance(payment);
    assert!(balance::value(&incoming) >= required, E_INSUFFICIENT_PAYMENT);

    let contribution = balance::split(&mut incoming, required);
    balance::join(&mut group.vault, contribution);
    transfer_or_destroy_zero(incoming, sender, ctx);

    *vector::borrow_mut(&mut group.paid_amounts_mist, member_index) = required;
    group.total_paid_mist = group.total_paid_mist + required;

    let paid_count = count_paid_members(&group.paid_amounts_mist);
    let participant_count = vector::length(&group.participants);

    event::emit(GroupAdventurePaymentReceived {
        group_id,
        payer: sender,
        amount_mist: required,
        paid_count,
        participant_count,
    });

    if (paid_count == participant_count) {
        group.status = GROUP_STATUS_STARTED;
        group.started_adventure_id = registry.next_adventure_id;
        registry.next_adventure_id = registry.next_adventure_id + 1;
        registry.total_adventures_started = registry.total_adventures_started + 1;

        event::emit(GroupAdventureStarted {
            group_id,
            adventure_id: group.started_adventure_id,
            participant_count,
            total_locked_mist: group.total_paid_mist,
        });
    };

    table::add(&mut registry.group_adventures, group_id, group);
}

public entry fun cancel_group_adventure_after_timeout(
    registry: &mut Registry,
    group_id: u64,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(table::contains(&registry.group_adventures, group_id), E_GROUP_NOT_FOUND);
    let sender = tx_context::sender(ctx);

    let mut group = table::remove(&mut registry.group_adventures, group_id);
    assert!(group.status == GROUP_STATUS_OPEN, E_GROUP_NOT_OPEN);
    assert!(clock::timestamp_ms(clock) > group.deadline_ms, E_GROUP_NOT_EXPIRED);
    assert!(find_participant_index(&group.participants, sender) < vector::length(&group.participants), E_GROUP_NOT_PARTICIPANT);

    group.status = GROUP_STATUS_CANCELLED;

    event::emit(GroupAdventureCancelled {
        group_id,
        cancelled_by: sender,
        total_locked_mist: group.total_paid_mist,
    });

    table::add(&mut registry.group_adventures, group_id, group);
}

public entry fun claim_group_refund(
    registry: &mut Registry,
    group_id: u64,
    ctx: &mut TxContext,
) {
    assert!(table::contains(&registry.group_adventures, group_id), E_GROUP_NOT_FOUND);
    let sender = tx_context::sender(ctx);

    let mut group = table::remove(&mut registry.group_adventures, group_id);
    assert!(group.status == GROUP_STATUS_CANCELLED, E_GROUP_NOT_CANCELLED);

    let member_index = find_participant_index(&group.participants, sender);
    assert!(member_index < vector::length(&group.participants), E_GROUP_NOT_PARTICIPANT);

    let amount = *vector::borrow(&group.paid_amounts_mist, member_index);
    assert!(amount > 0, E_GROUP_NO_REFUND);

    *vector::borrow_mut(&mut group.paid_amounts_mist, member_index) = 0;
    group.total_paid_mist = group.total_paid_mist - amount;

    let payout = balance::split(&mut group.vault, amount);
    transfer_or_destroy_zero(payout, sender, ctx);

    event::emit(GroupAdventureRefundClaimed {
        group_id,
        player: sender,
        amount_mist: amount,
        remaining_locked_mist: group.total_paid_mist,
    });

    table::add(&mut registry.group_adventures, group_id, group);
}

public entry fun close_settled_cancelled_group_adventure(
    registry: &mut Registry,
    group_id: u64,
    ctx: &mut TxContext,
) {
    assert!(table::contains(&registry.group_adventures, group_id), E_GROUP_NOT_FOUND);
    let sender = tx_context::sender(ctx);

    let group = table::remove(&mut registry.group_adventures, group_id);
    assert!(group.status == GROUP_STATUS_CANCELLED, E_GROUP_NOT_CANCELLED);
    assert!(group.total_paid_mist == 0, E_GROUP_NOT_SETTLED);
    assert!(sender == group.leader || sender == registry.admin, E_GROUP_UNAUTHORIZED);

    let GroupAdventure {
        leader: _,
        participants: _,
        per_player_contribution_mist: _,
        created_at_ms: _,
        deadline_ms: _,
        status: _,
        started_adventure_id: _,
        paid_amounts_mist: _,
        total_paid_mist: _,
        vault,
    } = group;

    balance::destroy_zero(vault);
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory NFT mint
// ─────────────────────────────────────────────────────────────────────────────

public entry fun mint_inventory_nft_paid(
    registry: &mut Registry,
    payment: Coin<OCT>,
    recipient: address,
    name: String,
    rarity_tier: u8,
    metadata_cid: String,
    lore_cid: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let mint_fee = registry.nft_mint_reserve_mist;
    collect_to_treasury_and_refund_change(registry, payment, mint_fee, ctx);
    mint_inventory_internal(registry, recipient, name, rarity_tier, metadata_cid, lore_cid, 0, clock, ctx);
}

public entry fun mint_inventory_nft_from_prepay(
    registry: &mut Registry,
    adventure_id: u64,
    name: String,
    rarity_tier: u8,
    metadata_cid: String,
    lore_cid: String,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(table::contains(&registry.adventure_escrows, adventure_id), E_ESCROW_NOT_FOUND);

    let sender = tx_context::sender(ctx);
    let mut escrow = table::remove(&mut registry.adventure_escrows, adventure_id);
    assert!(escrow.player == sender, E_ESCROW_NOT_OWNER);
    let mint_fee = registry.nft_mint_reserve_mist;
    consume_from_escrow_to_treasury(registry, &mut escrow, mint_fee);
    mint_inventory_internal(registry, sender, name, rarity_tier, metadata_cid, lore_cid, adventure_id, clock, ctx);
    table::add(&mut registry.adventure_escrows, adventure_id, escrow);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sale marketplace
// ─────────────────────────────────────────────────────────────────────────────

public entry fun list_inventory_for_sale(
    nft: InventoryNFT,
    price_mist: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(price_mist > 0, E_INVALID_PRICE);
    let seller = tx_context::sender(ctx);
    assert!(seller == nft.owner, E_NOT_OWNER);

    let listing = SaleListing {
        id: object::new(ctx),
        seller,
        price_mist,
        listed_at_ms: clock::timestamp_ms(clock),
        sold_price_mist: 0,
        active: true,
        buyer: option::none(),
        item: option::some(nft),
    };

    transfer::public_share_object(listing);
}

public entry fun buy_sale_listing(
    registry: &mut Registry,
    listing: &mut SaleListing,
    payment: Coin<OCT>,
    ctx: &mut TxContext,
) {
    assert!(listing.active, E_LISTING_INACTIVE);
    let buyer = tx_context::sender(ctx);
    assert!(buyer != listing.seller, E_SELF_PURCHASE);

    let mut incoming = coin::into_balance(payment);
    assert!(balance::value(&incoming) >= listing.price_mist, E_INSUFFICIENT_PAYMENT);

    let mut gross_payout = balance::split(&mut incoming, listing.price_mist);
    let market_fee_mist = percentage(listing.price_mist, registry.market_fee_bps);
    if (market_fee_mist > 0) {
        let fee = balance::split(&mut gross_payout, market_fee_mist);
        balance::join(&mut registry.treasury, fee);
    };
    transfer_or_destroy_zero(gross_payout, listing.seller, ctx);
    transfer_or_destroy_zero(incoming, buyer, ctx);

    let nft = option::extract(&mut listing.item);
    let listing_id = object::id(listing);
    let nft_id = object::id(&nft);

    listing.active = false;
    listing.sold_price_mist = listing.price_mist;
    listing.buyer = option::some(buyer);

    transfer::public_transfer(nft, buyer);
    registry.total_market_volume_mist = registry.total_market_volume_mist + listing.price_mist;

    event::emit(SalePurchased {
        listing_id,
        nft_id,
        seller: listing.seller,
        buyer,
        price_mist: listing.price_mist,
    });
}

public entry fun cancel_sale_listing(
    listing: &mut SaleListing,
    ctx: &mut TxContext,
) {
    assert!(listing.active, E_LISTING_ALREADY_FINALIZED);
    let sender = tx_context::sender(ctx);
    assert!(sender == listing.seller, E_NOT_OWNER);

    let nft = option::extract(&mut listing.item);
    listing.active = false;
    transfer::public_transfer(nft, sender);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rental marketplace
// ─────────────────────────────────────────────────────────────────────────────

public entry fun list_inventory_for_rent(
    nft: InventoryNFT,
    rent_price_mist: u64,
    collateral_mist: u64,
    duration_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(rent_price_mist > 0, E_INVALID_PRICE);
    assert!(duration_ms > 0, E_INVALID_DURATION);
    let lender = tx_context::sender(ctx);
    assert!(lender == nft.owner, E_NOT_OWNER);

    let listing = RentalListing {
        id: object::new(ctx),
        lender,
        rent_price_mist,
        collateral_mist,
        duration_ms,
        listed_at_ms: clock::timestamp_ms(clock),
        rental_started_at_ms: 0,
        rental_ends_at_ms: 0,
        active: true,
        renter: option::none(),
        collateral_vault: balance::zero(),
        item: option::some(nft),
    };

    transfer::public_share_object(listing);
}

public entry fun start_rental(
    registry: &mut Registry,
    listing: &mut RentalListing,
    payment: Coin<OCT>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(listing.active, E_LISTING_INACTIVE);
    assert!(option::is_none(&listing.renter), E_ALREADY_RENTED);

    let renter = tx_context::sender(ctx);
    assert!(renter != listing.lender, E_SELF_PURCHASE);

    let total_due = listing.rent_price_mist + listing.collateral_mist;
    let mut incoming = coin::into_balance(payment);
    assert!(balance::value(&incoming) >= total_due, E_INSUFFICIENT_PAYMENT);

    let mut charged = balance::split(&mut incoming, total_due);
    let collateral = balance::split(&mut charged, listing.collateral_mist);
    balance::join(&mut listing.collateral_vault, collateral);

    let mut lender_rent = charged;
    let market_fee_mist = percentage(listing.rent_price_mist, registry.market_fee_bps);
    if (market_fee_mist > 0) {
        let fee = balance::split(&mut lender_rent, market_fee_mist);
        balance::join(&mut registry.treasury, fee);
    };
    transfer_or_destroy_zero(lender_rent, listing.lender, ctx);
    transfer_or_destroy_zero(incoming, renter, ctx);

    let now = clock::timestamp_ms(clock);
    listing.renter = option::some(renter);
    listing.rental_started_at_ms = now;
    listing.rental_ends_at_ms = now + listing.duration_ms;
    registry.total_market_volume_mist = registry.total_market_volume_mist + listing.rent_price_mist;

    let item_ref = option::borrow(&listing.item);
    let nft_id = object::id(item_ref);
    let listing_id = object::id(listing);

    let permit = RentalPermit {
        id: object::new(ctx),
        listing_id,
        nft_id,
        renter,
        expires_at_ms: listing.rental_ends_at_ms,
    };
    transfer::transfer(permit, renter);

    event::emit(RentalStarted {
        listing_id,
        nft_id,
        lender: listing.lender,
        renter,
        rental_ends_at_ms: listing.rental_ends_at_ms,
    });
}

public entry fun return_rental(
    listing: &mut RentalListing,
    ctx: &mut TxContext,
) {
    assert!(listing.active, E_LISTING_INACTIVE);
    assert!(option::is_some(&listing.renter), E_NOT_RENTER);

    let sender = tx_context::sender(ctx);
    let renter = *option::borrow(&listing.renter);
    assert!(sender == renter, E_NOT_RENTER);

    let listing_id = object::id(listing);
    let nft = option::extract(&mut listing.item);
    let nft_id = object::id(&nft);
    let renter_addr = option::extract(&mut listing.renter);

    transfer_or_destroy_zero(balance::withdraw_all(&mut listing.collateral_vault), renter_addr, ctx);
    transfer::public_transfer(nft, listing.lender);
    listing.active = false;

    event::emit(RentalReturned {
        listing_id,
        nft_id,
        lender: listing.lender,
        renter: renter_addr,
    });
}

public entry fun claim_rental_default(
    registry: &mut Registry,
    listing: &mut RentalListing,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(listing.active, E_LISTING_INACTIVE);
    assert!(option::is_some(&listing.renter), E_NOT_RENTER);

    let sender = tx_context::sender(ctx);
    assert!(sender == listing.lender, E_NOT_LENDER);
    assert!(clock::timestamp_ms(clock) >= listing.rental_ends_at_ms, E_RENT_NOT_EXPIRED);

    let listing_id = object::id(listing);
    let nft = option::extract(&mut listing.item);
    let nft_id = object::id(&nft);
    let renter_addr = option::extract(&mut listing.renter);

    let collateral_amount = balance::value(&listing.collateral_vault);
    let default_fee = percentage(collateral_amount, registry.market_fee_bps);
    let mut collateral = balance::withdraw_all(&mut listing.collateral_vault);
    if (default_fee > 0) {
        let fee = balance::split(&mut collateral, default_fee);
        balance::join(&mut registry.treasury, fee);
    };

    transfer_or_destroy_zero(collateral, listing.lender, ctx);
    transfer::public_transfer(nft, listing.lender);
    listing.active = false;

    event::emit(RentalDefaultClaimed {
        listing_id,
        nft_id,
        lender: listing.lender,
        renter: renter_addr,
    });
}

public entry fun cancel_rental_listing(
    listing: &mut RentalListing,
    ctx: &mut TxContext,
) {
    assert!(listing.active, E_LISTING_ALREADY_FINALIZED);
    assert!(option::is_none(&listing.renter), E_ALREADY_RENTED);
    let sender = tx_context::sender(ctx);
    assert!(sender == listing.lender, E_NOT_LENDER);

    let nft = option::extract(&mut listing.item);
    listing.active = false;
    transfer::public_transfer(nft, sender);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fair dice (commit-reveal)
// ─────────────────────────────────────────────────────────────────────────────

public entry fun create_dice_session(
    adventure_id: u64,
    sides: u8,
    player_commitment: vector<u8>,
    server_commitment: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(sides >= 2, E_INVALID_DICE_SIDES);
    assert!(vector::length(&player_commitment) == 32, E_INVALID_COMMITMENT);
    assert!(vector::length(&server_commitment) == 32, E_INVALID_COMMITMENT);

    let session = DiceSession {
        id: object::new(ctx),
        adventure_id,
        player: tx_context::sender(ctx),
        sides,
        player_commitment,
        server_commitment,
        player_revealed: false,
        server_revealed: false,
        resolved: false,
        result: 0,
        created_at_ms: clock::timestamp_ms(clock),
    };

    transfer::public_share_object(session);
}

public entry fun reveal_player_seed(
    session: &mut DiceSession,
    seed: vector<u8>,
    ctx: &TxContext,
) {
    assert!(!session.resolved, E_DICE_ALREADY_RESOLVED);
    assert!(!session.player_revealed, E_DICE_ALREADY_REVEALED);
    assert!(tx_context::sender(ctx) == session.player, E_NOT_OWNER);
    assert!(hash::blake2b256(&seed) == session.player_commitment, E_INVALID_COMMITMENT);

    session.player_revealed = true;
}

public entry fun reveal_server_seed(
    registry: &Registry,
    admin_cap: &AdminCap,
    session: &mut DiceSession,
    seed: vector<u8>,
    ctx: &TxContext,
) {
    let _ = admin_cap;
    assert_admin(registry, ctx);
    assert!(!session.resolved, E_DICE_ALREADY_RESOLVED);
    assert!(!session.server_revealed, E_DICE_ALREADY_REVEALED);
    assert!(hash::blake2b256(&seed) == session.server_commitment, E_INVALID_COMMITMENT);

    session.server_revealed = true;
}

public entry fun finalize_dice_session(session: &mut DiceSession) {
    assert!(!session.resolved, E_DICE_ALREADY_RESOLVED);
    assert!(session.player_revealed && session.server_revealed, E_DICE_NOT_READY);

    let mut entropy = hash::blake2b256(&session.player_commitment);
    let server_component = hash::blake2b256(&session.server_commitment);
    vector::append(&mut entropy, server_component);
    vector::append(&mut entropy, bcs::to_bytes(&session.adventure_id));

    let digest = hash::blake2b256(&entropy);
    let random_byte = *vector::borrow(&digest, 0);
    let roll = (random_byte as u64 % (session.sides as u64)) + 1;

    session.result = roll as u8;
    session.resolved = true;

    event::emit(DiceSessionResolved {
        session_id: object::id(session),
        adventure_id: session.adventure_id,
        player: session.player,
        result: session.result,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Prepaid dice packs (hidden sequence + relayer consume)
// ─────────────────────────────────────────────────────────────────────────────

public entry fun create_adventure_dice_packs(
    registry: &Registry,
    admin_cap: &AdminCap,
    adventure_id: u64,
    player: address,
    total_rolls: u64,
    player_merkle_root: vector<u8>,
    ai_merkle_root: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let _ = admin_cap;
    assert_admin(registry, ctx);
    assert!(table::contains(&registry.adventure_escrows, adventure_id), E_ESCROW_NOT_FOUND);
    assert!(total_rolls > 0, E_DICEPACK_EMPTY);
    assert!(vector::length(&player_merkle_root) == 32, E_INVALID_DICE_ROOT);
    assert!(vector::length(&ai_merkle_root) == 32, E_INVALID_DICE_ROOT);
    let player_root_for_event = copy player_merkle_root;
    let ai_root_for_event = copy ai_merkle_root;

    let player_pack = DicePack {
        id: object::new(ctx),
        adventure_id,
        owner: player,
        role: DICEPACK_ROLE_PLAYER,
        total_rolls,
        used_rolls: 0,
        merkle_root: player_merkle_root,
        exhausted: false,
        created_at_ms: clock::timestamp_ms(clock),
    };
    let player_pack_id = object::id(&player_pack);

    let ai_pack = DicePack {
        id: object::new(ctx),
        adventure_id,
        owner: registry.admin,
        role: DICEPACK_ROLE_AI,
        total_rolls,
        used_rolls: 0,
        merkle_root: ai_merkle_root,
        exhausted: false,
        created_at_ms: clock::timestamp_ms(clock),
    };
    let ai_pack_id = object::id(&ai_pack);

    transfer::public_share_object(player_pack);
    transfer::public_share_object(ai_pack);

    event::emit(DicePackCreated {
        adventure_id,
        pack_id: player_pack_id,
        owner: player,
        role: DICEPACK_ROLE_PLAYER,
        total_rolls,
        merkle_root: player_root_for_event,
    });

    event::emit(DicePackCreated {
        adventure_id,
        pack_id: ai_pack_id,
        owner: registry.admin,
        role: DICEPACK_ROLE_AI,
        total_rolls,
        merkle_root: ai_root_for_event,
    });
}

public entry fun consume_dicepack_roll(
    registry: &Registry,
    admin_cap: &AdminCap,
    pack: &mut DicePack,
    sides: u8,
    entropy: u64,
    roll_salt: vector<u8>,
    merkle_proof: vector<vector<u8>>,
    ctx: &TxContext,
) {
    let _ = admin_cap;
    assert_admin(registry, ctx);
    assert!(sides >= 2, E_INVALID_DICE_SIDES);
    assert!(!pack.exhausted, E_DICEPACK_ALREADY_EXHAUSTED);
    assert!(pack.used_rolls < pack.total_rolls, E_DICEPACK_EMPTY);

    let roll_index = pack.used_rolls;
    let leaf = dice_leaf_hash(roll_index, entropy, roll_salt);
    let root = compute_merkle_root_from_leaf(leaf, merkle_proof);
    assert!(root == pack.merkle_root, E_INVALID_DICE_ROOT);
    let roll_value = (entropy % (sides as u64)) + 1;

    pack.used_rolls = pack.used_rolls + 1;
    if (pack.used_rolls == pack.total_rolls) {
        pack.exhausted = true;
    };

    event::emit(DicePackRollConsumed {
        adventure_id: pack.adventure_id,
        pack_id: object::id(pack),
        owner: pack.owner,
        role: pack.role,
        roll_index,
        sides,
        roll_value: roll_value as u8,
        remaining_rolls: pack.total_rolls - pack.used_rolls,
        relayed_by: tx_context::sender(ctx),
    });
}

public fun dicepack_remaining(pack: &DicePack): u64 {
    pack.total_rolls - pack.used_rolls
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

fun mint_inventory_internal(
    registry: &mut Registry,
    recipient: address,
    name: String,
    rarity_tier: u8,
    metadata_cid: String,
    lore_cid: String,
    adventure_id: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    let nft = InventoryNFT {
        id: object::new(ctx),
        creator: sender,
        owner: recipient,
        name,
        rarity_tier,
        metadata_cid,
        lore_cid,
        minted_at_ms: clock::timestamp_ms(clock),
    };
    let nft_id = object::id(&nft);

    registry.total_inventory_nft_minted = registry.total_inventory_nft_minted + 1;
    transfer::public_transfer(nft, recipient);

    event::emit(InventoryMinted {
        owner: recipient,
        nft_id,
        adventure_id,
    });
}

fun consume_from_escrow_to_treasury(
    registry: &mut Registry,
    escrow: &mut AdventureEscrow,
    amount_mist: u64,
) {
    assert!(balance::value(&escrow.vault) >= amount_mist, E_ESCROW_BUDGET_EXCEEDED);
    let consumed = balance::split(&mut escrow.vault, amount_mist);
    balance::join(&mut registry.treasury, consumed);
}

fun collect_to_treasury_and_refund_change(
    registry: &mut Registry,
    payment: Coin<OCT>,
    required_mist: u64,
    ctx: &mut TxContext,
) {
    let sender = tx_context::sender(ctx);
    let mut incoming = coin::into_balance(payment);
    assert!(balance::value(&incoming) >= required_mist, E_INSUFFICIENT_PAYMENT);

    let fee = balance::split(&mut incoming, required_mist);
    balance::join(&mut registry.treasury, fee);
    transfer_or_destroy_zero(incoming, sender, ctx);
}

fun transfer_or_destroy_zero(
    maybe_balance: Balance<OCT>,
    recipient: address,
    ctx: &mut TxContext,
) {
    if (balance::value(&maybe_balance) > 0) {
        transfer::public_transfer(coin::from_balance(maybe_balance, ctx), recipient);
    } else {
        balance::destroy_zero(maybe_balance);
    }
}

fun percentage(amount: u64, bps: u64): u64 {
    amount * bps / MAX_BPS
}

fun assert_admin(registry: &Registry, ctx: &TxContext) {
    assert!(tx_context::sender(ctx) == registry.admin, E_NOT_ADMIN);
}

fun ensure_address_in_vector(participants: &mut vector<address>, addr: address) {
    if (find_participant_index(participants, addr) == vector::length(participants)) {
        vector::push_back(participants, addr);
    };
}

fun assert_no_duplicate_addresses(participants: &vector<address>) {
    let len = vector::length(participants);
    let mut i = 0;
    while (i < len) {
        let left = *vector::borrow(participants, i);
        let mut j = i + 1;
        while (j < len) {
            let right = *vector::borrow(participants, j);
            assert!(left != right, E_GROUP_DUPLICATE_PARTICIPANT);
            j = j + 1;
        };
        i = i + 1;
    };
}

fun find_participant_index(participants: &vector<address>, addr: address): u64 {
    let len = vector::length(participants);
    let mut i = 0;
    while (i < len) {
        if (*vector::borrow(participants, i) == addr) {
            return i
        };
        i = i + 1;
    };
    len
}

fun count_paid_members(paid_amounts_mist: &vector<u64>): u64 {
    let len = vector::length(paid_amounts_mist);
    let mut i = 0;
    let mut paid = 0;
    while (i < len) {
        if (*vector::borrow(paid_amounts_mist, i) > 0) {
            paid = paid + 1;
        };
        i = i + 1;
    };
    paid
}

fun dice_leaf_hash(
    roll_index: u64,
    entropy: u64,
    roll_salt: vector<u8>,
): vector<u8> {
    let mut preimage = bcs::to_bytes(&roll_index);
    vector::append(&mut preimage, bcs::to_bytes(&entropy));
    vector::append(&mut preimage, roll_salt);
    hash::blake2b256(&preimage)
}

fun compute_merkle_root_from_leaf(
    leaf: vector<u8>,
    merkle_proof: vector<vector<u8>>,
): vector<u8> {
    let mut acc = leaf;
    let proof_len = vector::length(&merkle_proof);
    let mut i = 0;
    while (i < proof_len) {
        let sibling = *vector::borrow(&merkle_proof, i);
        assert!(vector::length(&sibling) == 32, E_INVALID_DICE_ROOT);
        acc = hash_pair_sorted(acc, sibling);
        i = i + 1;
    };
    acc
}

fun hash_pair_sorted(a: vector<u8>, b: vector<u8>): vector<u8> {
    if (bytes_lte(&a, &b)) {
        let mut preimage = a;
        vector::append(&mut preimage, b);
        hash::blake2b256(&preimage)
    } else {
        let mut preimage = b;
        vector::append(&mut preimage, a);
        hash::blake2b256(&preimage)
    }
}

fun bytes_lte(a: &vector<u8>, b: &vector<u8>): bool {
    let a_len = vector::length(a);
    let b_len = vector::length(b);
    let min_len = if (a_len < b_len) a_len else b_len;
    let mut i = 0;
    while (i < min_len) {
        let ai = *vector::borrow(a, i);
        let bi = *vector::borrow(b, i);
        if (ai < bi) {
            return true
        };
        if (ai > bi) {
            return false
        };
        i = i + 1;
    };
    a_len <= b_len
}
