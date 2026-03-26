#!/bin/sh

set -eu

NETWORK="${1:-testnet}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CONTRACT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
CLI_BIN="${ONECHAIN_CLI_BIN:-one_chain}"

case "$NETWORK" in
  mainnet)
    RPC_URL="https://rpc-mainnet.onelabs.cc:443"
    ENV_ALIAS="onechain-mainnet"
    ;;
  devnet)
    RPC_URL="https://rpc-devnet.onelabs.cc:443"
    ENV_ALIAS="onechain-devnet"
    ;;
  testnet)
    RPC_URL="https://rpc-testnet.onelabs.cc:443"
    ENV_ALIAS="onechain-testnet"
    ;;
  *)
    echo "Unsupported network: $NETWORK" >&2
    exit 1
    ;;
esac

cd "$CONTRACT_DIR"

echo "=== NFT-DND contract deploy ==="
echo "Directory: $CONTRACT_DIR"
echo "CLI: $CLI_BIN"
echo "Network: $NETWORK"
echo "RPC: $RPC_URL"
echo ""

if ! command -v "$CLI_BIN" >/dev/null 2>&1; then
  echo "Missing OneChain CLI binary: $CLI_BIN" >&2
  exit 1
fi

echo "1. Switching OneChain environment..."
"$CLI_BIN" client new-env --alias "$ENV_ALIAS" --rpc "$RPC_URL" >/dev/null 2>&1 || true
"$CLI_BIN" client switch --env "$ENV_ALIAS"
echo ""

echo "2. Active address..."
ACTIVE_ADDRESS=$("$CLI_BIN" client active-address 2>/dev/null || true)
echo "${ACTIVE_ADDRESS:-No active address configured}"
echo ""

echo "3. Current gas objects..."
"$CLI_BIN" client gas || true
echo ""

echo "4. Building Move package..."
"$CLI_BIN" move build
echo ""

echo "5. Publishing package to $ENV_ALIAS..."
echo "Save the package id, upgrade cap id and created registry object from the output below."
echo ""
"$CLI_BIN" client publish --gas-budget 100000000
