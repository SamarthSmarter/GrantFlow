export type NetworkMode = 'testnet' | 'sandbox';

export interface NetworkConfig {
  mode: NetworkMode;
  horizonUrl: string;
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string; // Grant Registry Contract ID
  milestoneEscrowContractId: string; // Milestone Escrow Contract ID
}

const DEFAULT_TESTNET_REGISTRY_ID = 'CC7VVKTGVSRNEZ4NGWL4AZBKXA6WIVPROT46J23M37FAZULUIYMS73UW';
const DEFAULT_TESTNET_MILESTONE_ESCROW_ID = 'CASSS3Q2B74AML2I2GWGLOA43IGP3XVFMCVP3MRSKPZK2C5SRODTWCWY';

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
