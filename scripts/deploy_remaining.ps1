$ErrorActionPreference = "Stop"
$address = "GDENR4KFRQ46VZUXIIRTKH2YGAVGZRTY7SXIROCEHZVWNCEW4ETIBJLA"

Write-Host "Deploying GrantRegistry..."
$grantRegistryId = stellar contract deploy --wasm target/wasm32-unknown-unknown/release/grant_registry.wasm --source grantflow-deployer --network testnet
Write-Host "GRANT_REGISTRY_ID=$grantRegistryId"

Write-Host "Deploying MilestoneEscrow..."
$milestoneEscrowId = stellar contract deploy --wasm target/wasm32-unknown-unknown/release/milestone_escrow.wasm --source grantflow-deployer --network testnet
Write-Host "MILESTONE_ESCROW_ID=$milestoneEscrowId"

Write-Host "Initializing GrantRegistry..."
stellar contract invoke --id $grantRegistryId --source grantflow-deployer --network testnet -- initialize --admin $address --milestone_escrow $milestoneEscrowId

Write-Host "Initializing MilestoneEscrow..."
stellar contract invoke --id $milestoneEscrowId --source grantflow-deployer --network testnet -- initialize --admin $address --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC --registry $grantRegistryId

Write-Host "Deployment and Initialization complete."
