# NFT-DND on OneChain

A next-generation dark-fantasy RPG infrastructure where gameplay stays fast off-chain, while value, ownership, and verifiable outcomes are anchored on OneChain.

NFT-DND is not a "blockchain skin" over a game. It is an integrated product architecture designed to solve a real market gap: players want meaningful digital ownership without sacrificing game responsiveness.

## Executive Summary

NFT-DND combines four high-value primitives into one product:

1. Real-time AI-directed RPG sessions (server-authoritative, low latency).
2. Verifiable on-chain ownership (Hero SBT identity + transferable inventory NFTs).
3. Native adventure economy with prepaid escrows, controlled mint budgets, and refunds.
4. Blockchain-first marketplace mechanics (buy/sell/rent with collateral and protocol fees).

The project is positioned as a scalable foundation for:

- Premium Web3 RPG gameplay loops.
- Asset-led monetization (minting, market fees, rentals).
- Long-term ecosystem expansion (guild gameplay, seasonal chronicles, interoperable digital identity).

## Why This Product Is Investable

### 1) Clear painkiller architecture

Most Web3 games fail by putting every action on-chain. NFT-DND uses a selective on-chain model:

- Off-chain: combat ticks, world simulation, AI orchestration, and high-frequency interactions.
- On-chain: identity, ownership, value transfer, verifiable randomness commitments, market settlements.

This preserves UX quality while keeping blockchain where trust and monetization matter.

### 2) Revenue-ready economic rails already implemented

The Move contract already includes fee and treasury logic for:

- Hero SBT mint fees.
- Adventure entry/generation/mint reserve prepayments.
- Marketplace transaction fees.
- Rental default/collateral resolution.

This is a practical monetization base, not theoretical tokenomics.

### 3) Differentiated IP engine: quest-context NFT generation

The backend generates NFT artifacts from actual quest history and location context, then publishes media + metadata to IPFS and marks them mintable in game inventory flow.

This creates a defensible asset narrative layer: items are born from player story events, not generic random drops.

### 4) Verifiability and fairness primitives

The project includes commit-reveal and Merkle-based dicepack mechanics in Move, with relayer-compatible consumption for high-throughput play.

This is a rare combination of game UX speed and cryptographic fairness signaling.

## Product Vision

**Core promise:**

Players explore a living dark-fantasy world where meaningful achievements become durable on-chain assets with economic utility.

**Design principle:**

Only high-value game moments become permanent:

- Hero identity and progression anchor.
- Rare/legendary quest artifacts.
- Market transactions and rental rights.
- Chronicle-grade events and proof-linked outcomes.

## Deep Technical Audit (Current State)

## Monorepo & Delivery Stack

- `client`: Next.js 16, React 19, OneChain wallet flows, gameplay UI and marketplace surfaces.
- `server`: Express + TypeScript API for gameplay orchestration, AI systems, IPFS upload, quest/NFT generation.
- `contracts`: Move package (`nft_dnd::registry`) deployed for OneChain-compatible execution.
- `shared`: Unified gameplay/on-chain types and cross-runtime utilities.
- `supabase`: persistent game state, quest history, combat, chronicles, inventory, player positions.

This structure reduces integration risk and speeds team scaling (clear boundaries, shared models, separate deploy surfaces).

## Blockchain Layer (OneChain Move Contract)

The contract is materially advanced and includes production-relevant primitives:

### Identity & progression

- Non-transferable `HeroSBT` with profile, stats, lore fields, and progression counters.
- Controlled updates via admin-gated progression entrypoints.

### Asset ownership

- Transferable `InventoryNFT` with metadata/lore CID references.
- Paid mint path and prepaid-escrow mint path (`mint_inventory_nft_paid`, `mint_inventory_nft_from_prepay`).

### Adventure economy primitives

- `start_adventure_and_prepay` with explicit generation and mint reserve budgeting.
- `consume_generation_budget` to debit compute/content costs.
- `close_adventure_and_refund` to return unused value.

### Group safety and anti-friction coordination

- Group adventure creation with deadlines.
- Per-participant contribution tracking.
- Timeout cancellation and individual refund claims.

### Marketplace depth beyond simple listings

- Spot sales: list, buy, cancel.
- Rentals: list, start, return, claim default.
- Collateral vault handling + protocol fee extraction.

### Fairness infrastructure

- Commit-reveal dice sessions.
- Merkle-root dice packs for precommitted hidden roll sequences.
- Admin/relayer roll consumption with proof validation and event logs.

### Protocol observability

Events emitted for mints, adventure lifecycle, group flows, sale/rental settlements, and dice consumption provide robust analytics and audit traces.

## NFT Item Generation Pipeline (Key Innovation)

The `/api/nft/generate-from-quest` pipeline is a standout product mechanic:

1. Pulls live quest context + recent action history.
2. Uses LLM orchestration to forge lore-consistent artifact design.
3. Generates item icon art (transparent game-ready output).
4. Uploads image + metadata JSON to IPFS.
5. Persists a mintable custom item instance with rarity/stats/perks/lore.
6. Optionally injects the item into character inventory.

This closes the loop between gameplay narrative, generated content, and blockchain-ready assetization.

## AI Gameplay Engine

Implemented AI modules support a dynamic DM-like experience:

- `QuestDirector`: narrative resolution by player action + roll outcomes, with dead-end protection.
- `ScenarioGenerator`: party-context-based room/scenario synthesis and DB application.
- NPC dialog generation and lore-aware interaction endpoints.

Combined with quest flow states and chronicle logging, this creates replayable content depth with minimal manual authoring overhead.

## Real-Time Game Systems

- Server-authoritative combat state machine with initiative, action resolution, and enemy AI turns.
- Procedural map generation with seeded deterministic options (oval/cave/irregular/l-shape/rectangle).
- Dynamic location context and quest-state-sensitive exits.
- Inventory/equipment/abilities APIs integrated with progression systems.

## Commercial Mechanics & Business Model Potential

NFT-DND’s architecture enables multiple monetization vectors:

- Primary mint economics (Hero identity + premium artifact mints).
- Adventure entry and generation-budget fees.
- Marketplace fee capture on sales and rentals.
- Premium seasonal drops bound to chronicle events.
- B2B licensing potential for AI quest/NFT generation engine.

Because value rails are contract-level and event-emitting, financial analytics and treasury strategy can be formalized early.

## Competitive Differentiators

1. **Selective on-chain architecture**: blockchain where trust/value is needed, not where latency kills UX.
2. **Narrative-born NFTs**: quest-history-driven artifact generation rather than static mint templates.
3. **Rental + collateral marketplace design**: deeper than standard NFT buy/sell loops.
4. **Adventure prepay escrow model**: transparent cost and refund mechanics for session economics.
5. **Cryptographic fairness path**: commit-reveal and Merkle dicepack primitives ready for advanced trust modes.
6. **Cross-layer consistency**: shared models across client/server/contract reduce implementation drift.

## Current Maturity Snapshot

Already implemented:

- Core OneChain Move registry with identity, minting, escrow, market, rental, dice primitives.
- Backend APIs for quests, combat, chronicles, NFT generation, and dice sessions.
- Frontend wallet-aware OneChain transaction flows and game interfaces.
- IPFS integration for NFT media + metadata persistence.
- Supabase-backed world, player, quest, and combat state.

Immediate scale-up opportunities:

- Relayer hardening and production key management.
- Indexer/analytics dashboard for on-chain and gameplay KPIs.
- Expanded marketplace UI and liquidity incentives.
- Season system with governance-linked chronicle milestones.

## Architecture Overview

```text
Player Client (Next.js)
  -> Server API (Express)
     -> Supabase (state, quests, combat, chronicles)
     -> OpenAI pipelines (quest narrative, scenario, NFT artifact generation)
     -> IPFS/Filebase (asset + metadata storage)
     -> OneChain wallet/relayer transactions
         -> Move contract (registry, SBT/NFT, escrow, market, dice)
```

## Repository Structure

```text
.
├── client/       # Next.js game + wallet + UX
├── server/       # Express gameplay backend + AI + NFT/IPFS pipelines
├── contracts/    # OneChain Move package (nft_dnd::registry)
├── shared/       # Shared models and on-chain target builders
├── supabase/     # SQL + migrations
└── docs/         # Product/architecture docs (Nextra)
```

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Configure env:

```bash
cp .env.example .env
```

3. Start the full workspace:

```bash
pnpm dev
```

By default this boots:

- Client: `http://localhost:3000`
- Docs: `http://localhost:3001`
- Server: `http://localhost:4000`

## Core Environment Inputs

- OpenAI: `OPENAI_API_KEY`
- Supabase: `SUPABASE_URL`, keys
- IPFS/Filebase: `IPFS_*`
- OneChain (server + client): package/object ids, RPC, network, deploy digest
- Optional relayer guard: `DICEPACK_RELAYER_KEY`

## OneChain Defaults

- Testnet RPC: `https://rpc-testnet.onelabs.cc:443`
- Devnet RPC: `https://rpc-devnet.onelabs.cc:443`
- Mainnet RPC: `https://rpc-mainnet.onelabs.cc:443`

## Strategic Expansion Roadmap

### Phase 1: Product hardening

- Production relayer and transaction reliability SLAs.
- KPI instrumentation across gameplay + treasury + market liquidity.
- Anti-abuse/risk controls for mint and listing flows.

### Phase 2: Growth loops

- Seasonal narrative campaigns with limited artifact classes.
- Guild/group adventure economy and cooperative staking patterns.
- Deeper creator tooling around quest templates and rarity budgets.

### Phase 3: Ecosystem

- Cross-game utility for Hero SBT identity.
- Partner integrations for asset interoperability.
- Governance-linked world events and treasury-backed rewards.

## Investment Thesis

NFT-DND is building where high-retention RPG design meets real digital ownership economics.

It has:

- A technically credible on-chain core.
- A differentiated AI-to-NFT content engine.
- Multiple fee and market-based monetization surfaces.
- A product architecture designed for both player retention and treasury growth.

For partners and investors, this is a high-upside infrastructure play on the next generation of interactive, asset-native game worlds.
