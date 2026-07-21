# Deploy scripts for InvoiceX Soroban smart contracts on Stellar Testnet for Windows

$ErrorActionPreference = "Stop"

# Configurations
$Network = "testnet"
$SourceAccount = "admin" # Name of your local stellar identity
$RegistryWasm = "target/wasm32-unknown-unknown/release/invoice_registry.wasm"
$PaymentWasm = "target/wasm32-unknown-unknown/release/payment_manager.wasm"

Write-Host "=== Building Smart Contracts ===" -ForegroundColor Green
cargo build --target wasm32-unknown-unknown --release

if (Get-Command stellar -ErrorAction SilentlyContinue) {
    Write-Host "=== Optimizing Contracts ===" -ForegroundColor Green
    stellar contract optimize --wasm $RegistryWasm
    stellar contract optimize --wasm $PaymentWasm
    $RegistryWasm = "target/wasm32-unknown-unknown/release/invoice_registry.optimized.wasm"
    $PaymentWasm = "target/wasm32-unknown-unknown/release/payment_manager.optimized.wasm"
}

Write-Host "=== Deploying InvoiceRegistry contract ===" -ForegroundColor Green
$RegistryId = (stellar contract deploy --wasm $RegistryWasm --source $SourceAccount --network $Network).Trim()
Write-Host "InvoiceRegistry Contract ID: $RegistryId" -ForegroundColor Cyan

Write-Host "=== Deploying PaymentManager contract ===" -ForegroundColor Green
$PaymentId = (stellar contract deploy --wasm $PaymentWasm --source $SourceAccount --network $Network).Trim()
Write-Host "PaymentManager Contract ID: $PaymentId" -ForegroundColor Cyan

# Save IDs for initialization
"REGISTRY_CONTRACT_ID=$RegistryId" | Out-File -FilePath .env.contracts -Encoding utf8
"PAYMENT_CONTRACT_ID=$PaymentId" | Out-File -FilePath .env.contracts -Append -Encoding utf8

Write-Host "=== Deployment Succeeded! ===" -ForegroundColor Green
Write-Host "Contract IDs saved to .env.contracts"
Write-Host "Please run initialize-contracts.ps1 next."
