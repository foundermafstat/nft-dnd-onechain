# Contracts

This directory contains the OneChain `Move` package for NFT-DND.
The contracts now include end-to-end gameplay economy primitives:

- Hero SBT minting (non-transferable identity)
- Inventory NFT minting (transferable item assets)
- Sale marketplace (list, buy, cancel)
- Rental marketplace (list, rent, return, default claim)
- Adventure prepay escrow (generation + mint reserve + refunds)
- Treasury and fee management

## Directory layout

- `Move.toml`: Move package manifest configured for OneChain testnet framework
- `sources/`: contract sources (`nft_dnd::registry`)
- `tests/`: Move test entry point
- `scripts/deploy.sh`: testnet/devnet deploy helper
- `deploy.sh`: convenience wrapper from the contracts root
- `contract-config.json`: place to record deployed object ids after publish

## Local workflow

```bash
cd contracts
one_chain move build --skip-fetch-latest-git-deps
one_chain move test
```

Or via package scripts:

```bash
pnpm --dir contracts move:build
pnpm --dir contracts move:test
```

## Main contract entrypoints

### Admin

- `update_fee_config`
- `withdraw_treasury`

### Hero SBT

- `mint_hero_sbt`
- `burn_hero_sbt`
- `update_hero_progress`

### Adventure prepay

- `start_adventure_and_prepay`
- `consume_generation_budget`
- `close_adventure_and_refund`

### Group Participation Guard (Anti-AFK)

- `create_group_adventure`
- `pay_group_adventure_participation`
- `cancel_group_adventure_after_timeout`
- `claim_group_refund`
- `close_settled_cancelled_group_adventure`

### Inventory NFT

- `mint_inventory_nft_paid`
- `mint_inventory_nft_from_prepay`

### Sales

- `list_inventory_for_sale`
- `buy_sale_listing`
- `cancel_sale_listing`

### Rentals

- `list_inventory_for_rent`
- `start_rental`
- `return_rental`
- `claim_rental_default`
- `cancel_rental_listing`

### Fair Dice (Commit-Reveal)

- `create_dice_session`
- `reveal_player_seed`
- `reveal_server_seed`
- `finalize_dice_session`

### Prepaid DicePack (No Per-Roll User Signature)

- `create_adventure_dice_packs` (creates player+AI packs from hidden merkle roots)
- `consume_dicepack_roll` (relayer/admin consumes next hidden roll with merkle proof)

## Deploy to OneChain testnet

1. Configure the active wallet in the OneChain CLI.
2. Ensure the wallet has gas on testnet (OCT).
3. Run:

```bash
cd contracts
./deploy.sh testnet
```

You can also use:

```bash
pnpm --dir contracts deploy:testnet
```

## After deploy

Copy the important values from publish output into `contract-config.json`:

- `packageId`
- `deployerAddress`
- `registryObjectId`
- `upgradeCapId`
- `transactionDigest`
- `deployedAt`

This makes the directory ready for later integration from the app and backend.

## Notes

- `move build` passes for the current package.
- `move test` may fail in this environment due upstream framework test-only
  dependency/linking issues (`std::unit_test::create_signers_for_testing`).
  This does not affect publishability of this package itself.
