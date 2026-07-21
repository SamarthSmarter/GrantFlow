#!/usr/bin/env bash
# Initialize deployed InvoiceX smart contracts on Stellar Testnet

set -eo pipefail

if [ ! -f .env.contracts ]; then
    echo "Error: .env.contracts not found! Please run deploy-testnet.sh first."
    exit 1
fi

# Load variables
source .env.contracts

# Configurations
NETWORK="testnet"
SOURCE_ACCOUNT="admin"
# Default Native XLM Token Contract Address on Stellar Testnet
TOKEN_CONTRACT="CDLZFC3SYJYDZT7K67VZ75HPJFCBQWOABMSIA27BHFC7WOFX734V2Z6I"

# Get Admin Public Key from local identity
ADMIN_PUBKEY=$(stellar keys address "$SOURCE_ACCOUNT")

echo "=== Initializing Contracts ==="
echo "Admin Address: $ADMIN_PUBKEY"
echo "Token Contract ID: $TOKEN_CONTRACT"
echo "InvoiceRegistry Contract ID: $REGISTRY_CONTRACT_ID"
echo "PaymentManager Contract ID: $PAYMENT_CONTRACT_ID"

echo "=== Step 1: Initializing InvoiceRegistry ==="
stellar contract invoke \
  --id "$REGISTRY_CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_PUBKEY" \
  --payment_manager "$PAYMENT_CONTRACT_ID"

echo "=== Step 2: Initializing PaymentManager ==="
stellar contract invoke \
  --id "$PAYMENT_CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_PUBKEY" \
  --token "$TOKEN_CONTRACT" \
  --registry "$REGISTRY_CONTRACT_ID"

echo "=== All Contracts Successfully Initialized! ==="
echo "You can now configure these addresses in your frontend config.mode === 'testnet'"
