#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$SCRIPT_DIR"

sh "$SCRIPT_DIR/scripts/deploy.sh" "${1:-testnet}"
