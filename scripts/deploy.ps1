# GrantFlow Soroban Smart Contract Deployment Script
# Deploys all 5 workspace contracts to the testnet and records their IDs.

Write-Host "Deploying GrantFlow Contracts to Testnet..."

$network = "testnet"
$source = "admin" # assuming the admin identity is already configured

Write-Host "1. Building contracts..."
cargo build --target wasm32-unknown-unknown --release

Write-Host "2. Deploying Grant Registry..."
$grantRegistryId = stellar contract deploy --wasm target/wasm32-unknown-unknown/release/grant_registry.wasm --source $source --network $network
Write-Host "Grant Registry deployed at: $grantRegistryId"

Write-Host "3. Deploying Milestone Escrow..."
$milestoneEscrowId = stellar contract deploy --wasm target/wasm32-unknown-unknown/release/milestone_escrow.wasm --source $source --network $network
Write-Host "Milestone Escrow deployed at: $milestoneEscrowId"

Write-Host "4. Deploying Dispute Resolver..."
$disputeResolverId = stellar contract deploy --wasm target/wasm32-unknown-unknown/release/dispute_resolver.wasm --source $source --network $network
Write-Host "Dispute Resolver deployed at: $disputeResolverId"

Write-Host "5. Deploying Invoice Registry..."
$invoiceRegistryId = stellar contract deploy --wasm target/wasm32-unknown-unknown/release/invoice_registry.wasm --source $source --network $network
Write-Host "Invoice Registry deployed at: $invoiceRegistryId"

Write-Host "6. Deploying Payment Manager..."
$paymentManagerId = stellar contract deploy --wasm target/wasm32-unknown-unknown/release/payment_manager.wasm --source $source --network $network
Write-Host "Payment Manager deployed at: $paymentManagerId"

Write-Host ""
Write-Host "Deployment Complete!"
Write-Host "Please update src/services/network.ts with these contract IDs."
