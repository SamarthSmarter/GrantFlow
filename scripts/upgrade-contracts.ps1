# Deploy/Install new WASM bytecode for upgrading contracts on Stellar Testnet for Windows

$ErrorActionPreference = "Stop"

if (-not (Test-Path .env.contracts)) {
    Write-Error "Error: .env.contracts not found! Please run deploy-testnet.ps1 first."
    exit 1
}

# Parse variables
$EnvContent = Get-Content .env.contracts
$RegistryContractId = ""
foreach ($Line in $EnvContent) {
    if ($Line -match "REGISTRY_CONTRACT_ID=(.*)") {
        $RegistryContractId = $Matches[1].Trim()
    }
}

$Network = "testnet"
$SourceAccount = "admin"
$NewWasm = "target/wasm32-unknown-unknown/release/invoice_registry.wasm"

Write-Host "=== Compiling new smart contract version ===" -ForegroundColor Green
cargo build --target wasm32-unknown-unknown --release

Write-Host "=== Uploading new WASM bytecode to Stellar network ===" -ForegroundColor Green
$WasmHash = (stellar contract install --wasm $NewWasm --source $SourceAccount --network $Network).Trim()

Write-Host "New WASM Hash: $WasmHash" -ForegroundColor Cyan
Write-Host ""
Write-Host "=== Step 2: Contract Update ===" -ForegroundColor Green
Write-Host "If your contract has an upgrade function, run the following:"
Write-Host "stellar contract invoke --id $RegistryContractId --source $SourceAccount --network $Network -- upgrade --new_wasm_hash $WasmHash"
