# Contracts

This directory contains the OneChain `Move` package for NFT-DND and is now
prepared with a deploy scaffold similar to the reference project structure.

## Directory layout

- `Move.toml`: Move package manifest configured for OneChain testnet framework
- `sources/`: contract sources
- `tests/`: Move test entry point
- `scripts/deploy.sh`: testnet/devnet deploy helper
- `deploy.sh`: convenience wrapper from the contracts root
- `contract-config.json`: place to record deployed object ids after publish

## Local workflow

```bash
cd contracts
one_chain move build
one_chain move test
```

Or via package scripts:

```bash
pnpm --dir contracts move:build
pnpm --dir contracts move:test
```

## Deploy to OneChain testnet

1. Configure the active wallet in the OneChain CLI.
2. Ensure the wallet has gas on testnet.
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
