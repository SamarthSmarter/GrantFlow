export type NetworkMode = 'testnet' | 'sandbox';

export interface NetworkConfig {
  mode: NetworkMode;
  horizonUrl: string;
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string; // Grant Registry Contract ID
  milestoneEscrowContractId: string; // Milestone Escrow Contract ID
}

const DEFAULT_TESTNET_REGISTRY_ID = 'CDA7M4K2Z6KRP4XF5FQCJZ66J4WCRKTRM6UX6GL57H7JSP2HULMXYVXT';
const DEFAULT_TESTNET_MILESTONE_ESCROW_ID = 'CB5J27H7Q5S3X7F4P3Z5U4Z2Z4Z2Z4Z2Z4Z2Z4Z2Z4Z2Z4Z2Z4Z2Z4Z2';

function getValidTestnetContractId(key: string, defaultValue: string): string {
  const value = localStorage.getItem(key);
  if (value && /^C[A-Z2-7]{55}$/.test(value.trim())) {
    return value.trim();
  }
  return defaultValue;
}

export const TESTNET_CONFIG: NetworkConfig = {
  mode: 'testnet',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  contractId: getValidTestnetContractId('grantflow_contract_id', DEFAULT_TESTNET_REGISTRY_ID),
  milestoneEscrowContractId: getValidTestnetContractId('grantflow_escrow_contract_id', DEFAULT_TESTNET_MILESTONE_ESCROW_ID),
};

export const SANDBOX_CONFIG: NetworkConfig = {
  mode: 'sandbox',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  contractId: 'SANDBOX_GRANT_REGISTRY_ID',
  milestoneEscrowContractId: 'SANDBOX_MILESTONE_ESCROW_ID',
};

export function getNetworkConfig(): NetworkConfig {
  const mode = (localStorage.getItem('grantflow_network_mode') as NetworkMode) || 'sandbox';
  return mode === 'testnet' ? TESTNET_CONFIG : SANDBOX_CONFIG;
}

export function setNetworkMode(mode: NetworkMode): void {
  localStorage.setItem('grantflow_network_mode', mode);
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('grantflow_network_change'));
}

export function setContractId(contractId: string): void {
  localStorage.setItem('grantflow_contract_id', contractId);
  TESTNET_CONFIG.contractId = contractId;
  window.dispatchEvent(new Event('grantflow_contract_change'));
}

export function setContractIds(registryId: string, escrowId: string): void {
  localStorage.setItem('grantflow_contract_id', registryId);
  localStorage.setItem('grantflow_escrow_contract_id', escrowId);
  TESTNET_CONFIG.contractId = registryId;
  TESTNET_CONFIG.milestoneEscrowContractId = escrowId;
  window.dispatchEvent(new Event('grantflow_contract_change'));
}
