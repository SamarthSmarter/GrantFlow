# Initialize deployed InvoiceX smart contracts on Stellar Testnet for Windows

$ErrorActionPreference = "Stop"

if (-not (Test-Path .env.contracts)) {
    Write-Error "Error: .env.contracts not found! Please run deploy-testnet.ps1 first."
    exit 1
}

# Parse variables
$EnvContent = Get-Content .env.contracts
$RegistryContractId = ""
$PaymentContractId = ""

foreach ($Line in $EnvContent) {
    if ($Line -match "REGISTRY_CONTRACT_ID=(.*)") {
        $RegistryContractId = $Matches[1].Trim()
    }
    if ($Line -match "PAYMENT_CONTRACT_ID=(.*)") {
        $PaymentContractId = $Matches[1].Trim()
    }
}

# Configurations
$Network = "testnet"
$SourceAccount = "admin"
# Default Native XLM Token Contract Address on Stellar Testnet
$TokenContract = "CDLZFC3SYJYDZT7K67VZ75HPJFCBQWOABMSIA27BHFC7WOFX734V2Z6I"

# Get Admin Public Key
$AdminPubKey = (stellar keys address $SourceAccount).Trim()

Write-Host "=== Initializing Contracts ===" -ForegroundColor Green
Write-Host "Admin Address: $AdminPubKey"
Write-Host "Token Contract ID: $TokenContract"
Write-Host "InvoiceRegistry Contract ID: $RegistryContractId"
Write-Host "PaymentManager Contract ID: $PaymentContractId"

Write-Host "=== Step 1: Initializing InvoiceRegistry ===" -ForegroundColor Green
stellar contract invoke `
  --id $RegistryContractId `
  --source $SourceAccount `
  --network $Network `
  -- initialize `
  --admin $AdminPubKey `
  --payment_manager $PaymentContractId

Write-Host "=== Step 2: Initializing PaymentManager ===" -ForegroundColor Green
stellar contract invoke `
  --id $PaymentContractId `
  --source $SourceAccount `
  --network $Network `
  -- initialize `
  --admin $AdminPubKey `
  --token $TokenContract `
  --registry $RegistryContractId

Write-Host "=== All Contracts Successfully Initialized! ===" -ForegroundColor Green
