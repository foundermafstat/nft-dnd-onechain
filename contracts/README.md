# Contracts

This package contains the OneChain `Move` contracts for NFT-DND.

## Local workflow

```bash
cd contracts
one move build
one move test
```

## Publish to OneChain

```bash
cd contracts
one client new-env --alias testnet --rpc https://rpc-testnet.onelabs.cc:443
one client switch --env testnet
one client publish
```

The helper script `scripts/deploy.sh` wraps the environment switch for public
OneChain networks.
