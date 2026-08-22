import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchGrants, getUniqueGrantors, countGrantsByStatus } from '../services/search';
import * as contract from '../services/contract';

// Mock the contract module
vi.mock('../services/contract', () => ({
  getSandboxGrants: vi.fn(),
}));

const MOCK_GRANTS = [
  {
    id: 'grt_001',
    title: 'DeFi Analytics Dashboard',
    proposal: 'Build a real-time dashboard for Stellar DeFi protocols',
    grantorName: 'Stellar Foundation',
    grantorEmail: 'grants@stellar.org',
    grantorAddress: 'GAAAABBBB',
    amount: '8500',
    milestoneDeadline: '2026-12-31',
    milestoneRequirements: 'Working dashboard with 3 metrics',
    status: 'pending',
    txHash: 'tx_001',
    network: 'sandbox',
  },
  {
    id: 'grt_002',
    title: 'NFT Marketplace Integration',
    proposal: 'Integrate NFT support into GrantFlow escrow',
    grantorName: 'Web3 DAO',
    grantorEmail: 'dao@web3.com',
    grantorAddress: 'GCCCCDDDD',
    amount: '15000',
    milestoneDeadline: '2026-11-30',
    milestoneRequirements: 'Smart contract integration',
    status: 'funded',
    txHash: 'tx_002',
    network: 'sandbox',
  },
  {
    id: 'grt_003',
    title: 'Security Audit Report',
    proposal: 'Comprehensive smart contract security audit',
    grantorName: 'Stellar Foundation',
    grantorEmail: 'grants@stellar.org',
    grantorAddress: 'GAAAABBBB',
    amount: '3000',
    milestoneDeadline: '2026-10-31',
    milestoneRequirements: 'Audit report PDF',
    status: 'rejected',
    txHash: 'tx_003',
    network: 'sandbox',
  },
];

describe('Grant Search Service', () => {
  beforeEach(() => {
    vi.mocked(contract.getSandboxGrants).mockReturnValue(MOCK_GRANTS as any);
  });

  it('should return all grants with no filters', () => {
    const result = searchGrants({});
    expect(result.total).toBe(3);
  });

  it('should filter by status', () => {
    const result = searchGrants({ status: 'funded' });
    expect(result.total).toBe(1);
    expect(result.grants[0].id).toBe('grt_002');
  });

  it('should search by text in title', () => {
    const result = searchGrants({ text: 'analytics' });
    expect(result.total).toBe(1);
    expect(result.grants[0].id).toBe('grt_001');
  });

  it('should search by text in grantor name', () => {
    const result = searchGrants({ text: 'stellar foundation' });
    expect(result.total).toBe(2);
  });

  it('should filter by minimum amount', () => {
    const result = searchGrants({ minAmount: 5000 });
    expect(result.total).toBe(2);
  });

  it('should filter by grantor address', () => {
    const result = searchGrants({ grantorAddress: 'GAAAABBBB' });
    expect(result.total).toBe(2);
  });

  it('should sort by amount ascending', () => {
    const result = searchGrants({ sortField: 'amount', sortDirection: 'asc' });
    const amounts = result.grants.map(g => parseFloat(g.amount));
    expect(amounts[0]).toBeLessThan(amounts[1]);
  });

  it('should paginate results correctly', () => {
    const result = searchGrants({ limit: 2, offset: 0 });
    expect(result.grants.length).toBe(2);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);

    const page2 = searchGrants({ limit: 2, offset: 2 });
    expect(page2.grants.length).toBe(1);
    expect(page2.page).toBe(2);
  });

  it('should return unique grantors without duplicates', () => {
    const grantors = getUniqueGrantors();
    expect(grantors.length).toBe(2); // Stellar Foundation + Web3 DAO
  });

  it('should count grants by status correctly', () => {
    expect(countGrantsByStatus('pending')).toBe(1);
    expect(countGrantsByStatus('funded')).toBe(1);
    expect(countGrantsByStatus('rejected')).toBe(1);
  });
});
