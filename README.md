# NFT-DND on OneChain

This repository is now organized as a `pnpm` workspace powered by Turborepo. It includes:

- `client` — a `Next.js 16` web client.
- `docs` — a `Nextra` documentation site.
- `server` — an `Express.js` backend.
- `contracts` — a `Move` package for OneChain deployment.

## Getting started

```bash
pnpm install
pnpm dev
```

The root `pnpm dev` command starts:

- `client` on `http://localhost:3000`
- `docs` on `http://localhost:3001`
- `server` on `http://localhost:4000`

## Workspace commands

```bash
pnpm dev
pnpm build
pnpm check
```

## OneChain defaults

The workspace is configured around the public OneChain endpoints documented by OneLabs:

- Testnet RPC: `https://rpc-testnet.onelabs.cc:443`
- Devnet RPC: `https://rpc-devnet.onelabs.cc:443`
- Mainnet RPC: `https://rpc-mainnet.onelabs.cc:443`

You can override network values with environment variables from `.env.example`.
