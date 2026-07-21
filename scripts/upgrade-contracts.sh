#!/usr/bin/env bash
# Deploy/Install new WASM bytecode for upgrading contracts on Stellar Testnet

set -eo pipefail

if [ ! -f .env.contracts ]; then
    echo "Error: .env.contracts not found! Please run deploy-testnet.sh first."
    exit 1
fi

source .env.contracts

NETWORK="testnet"
SOURCE_ACCOUNT="admin"
NEW_WASM="target/wasm32-unknown-unknown/release/invoice_registry.wasm"

echo "=== Compiling new smart contract version ==="
cargo build --target wasm32-unknown-unknown --release

echo "=== Uploading new WASM bytecode to Stellar network ==="
# This returns the new 32-byte WASM hash hex
WASM_HASH=$(stellar contract install \
  --wasm "$NEW_WASM" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK")

echo "New WASM Hash: $WASM_HASH"
echo ""
echo "=== Step 2: Contract Update ==="
echo "If your contract has an upgrade function (e.g. using env.deployer().update_current_contract_wasm(hash)),"
echo "you can invoke it with the following command:"
echo ""
echo "stellar contract invoke \\"
echo "  --id \"$REGISTRY_CONTRACT_ID\" \\"
echo "  --source \"$SOURCE_ACCOUNT\" \\"
echo "  --network \"$NETWORK\" \\"
echo "  -- upgrade \\"
echo "  --new_wasm_hash \"$WASM_HASH\""
echo ""
echo "Upgrade setup documentation created."
