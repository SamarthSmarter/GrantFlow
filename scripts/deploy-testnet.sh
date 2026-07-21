#!/usr/bin/env bash
# Deploy scripts for InvoiceX Soroban smart contracts on Stellar Testnet

set -eo pipefail

# Configurations
NETWORK="testnet"
SOURCE_ACCOUNT="admin" # Name of your local stellar identity
REGISTRY_WASM="target/wasm32-unknown-unknown/release/invoice_registry.wasm"
PAYMENT_WASM="target/wasm32-unknown-unknown/release/payment_manager.wasm"

echo "=== Building Smart Contracts ==="
cargo build --target wasm32-unknown-unknown --release

echo "=== Optimizing Contracts (if stellar CLI supports it) ==="
if command -v stellar &> /dev/null; then
    # Optimize wasm modules
    stellar contract optimize --wasm "$REGISTRY_WASM"
    stellar contract optimize --wasm "$PAYMENT_WASM"
    REGISTRY_WASM="target/wasm32-unknown-unknown/release/invoice_registry.optimized.wasm"
    PAYMENT_WASM="target/wasm32-unknown-unknown/release/payment_manager.optimized.wasm"
fi

echo "=== Deploying InvoiceRegistry contract ==="
REGISTRY_ID=$(stellar contract deploy \
  --wasm "$REGISTRY_WASM" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK")

echo "InvoiceRegistry Contract ID: $REGISTRY_ID"

echo "=== Deploying PaymentManager contract ==="
PAYMENT_ID=$(stellar contract deploy \
  --wasm "$PAYMENT_WASM" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK")

echo "PaymentManager Contract ID: $PAYMENT_ID"

# Save IDs for initialization
echo "REGISTRY_CONTRACT_ID=$REGISTRY_ID" > .env.contracts
echo "PAYMENT_CONTRACT_ID=$PAYMENT_ID" >> .env.contracts

echo "=== Deployment Succeeded! ==="
echo "Contract IDs saved to .env.contracts"
echo "Please run initialize-contracts.sh next."
