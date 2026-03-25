#!/bin/sh

set -eu

NETWORK="${1:-testnet}"

case "$NETWORK" in
  mainnet)
    RPC_URL="https://rpc-mainnet.onelabs.cc:443"
    ;;
  devnet)
    RPC_URL="https://rpc-devnet.onelabs.cc:443"
    ;;
  testnet)
    RPC_URL="https://rpc-testnet.onelabs.cc:443"
    ;;
  *)
    echo "Unsupported network: $NETWORK" >&2
    exit 1
    ;;
esac

echo "Switching OneChain CLI to $NETWORK ($RPC_URL)"
one client new-env --alias "$NETWORK" --rpc "$RPC_URL" || true
one client switch --env "$NETWORK"
echo "Publishing Move package from $(pwd)"
one client publish
