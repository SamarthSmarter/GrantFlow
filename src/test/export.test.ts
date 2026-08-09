import { describe, it, expect } from 'vitest';
import { grantsToCSV, grantsToJSON } from '../services/export';
import type { GrantContractState } from '../services/contract';

const mockGrants: GrantContractState[] = [
  {
    id: 'grt_test1',
    grantorName: 'Test DAO',
    grantorEmail: 'test@dao.org',
    grantorAddress: 'GBMOCKADDRESS1234567890ABCDEFGHIJKLMNOPQRSTUV',
    title: 'Test Grant One',
    proposal: 'A test proposal',
    amount: '5000.0000',
    milestoneDeadline: '2026-12-31',
    milestoneRequirements: 'M1: done',
    applicant: 'GBAPPLICANT123456',
    status: 'pending',
    txHash: 'hash_abc123',
    timestamp: 1700000000000,
  },
  {
    id: 'grt_test2',
    grantorName: 'Another DAO, Inc.',
    grantorEmail: 'grants@another.org',
    grantorAddress: 'GBMOCKADDRESS0987654321ZYXWVUTSRQPONMLKJIHGF',
    title: 'Grant with "quotes" and, commas',
    proposal: 'A proposal with special characters',
    amount: '12000.0000',
    milestoneDeadline: '2026-06-15',
    milestoneRequirements: 'M1: delivery',
    applicant: 'GBAPPLICANT789012',
    status: 'funded',
    txHash: 'hash_xyz789',
    releaseTxHash: 'release_hash_456',
    timestamp: 1700100000000,
  },
];

describe('Export Service', () => {
  it('should generate valid CSV with headers and rows', () => {
    const csv = grantsToCSV(mockGrants);

    expect(csv).toContain('Grant ID');
    expect(csv).toContain('Title');
    expect(csv).toContain('Amount (XLM)');
    expect(csv).toContain('grt_test1');
    expect(csv).toContain('grt_test2');
    expect(csv).toContain('5000.0000');
    expect(csv).toContain('12000.0000');

    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // header + 2 rows
  });

  it('should properly escape CSV fields with commas and quotes', () => {
    const csv = grantsToCSV(mockGrants);

    // The title with quotes and commas should be properly escaped
    expect(csv).toContain('"Grant with ""quotes"" and, commas"');
    // The grantor name with comma should be escaped
    expect(csv).toContain('"Another DAO, Inc."');
  });

  it('should return empty string for empty grant array', () => {
    const csv = grantsToCSV([]);
    expect(csv).toBe('');
  });

  it('should generate valid JSON with all grant fields', () => {
    const json = grantsToJSON(mockGrants);
    const parsed = JSON.parse(json);

    expect(parsed.total_grants).toBe(2);
    expect(parsed.grants).toHaveLength(2);
    expect(parsed.exported_at).toBeDefined();
    expect(parsed.grants[0].id).toBe('grt_test1');
    expect(parsed.grants[0].grantor.name).toBe('Test DAO');
    expect(parsed.grants[1].release_tx_hash).toBe('release_hash_456');
  });

  it('should include null for missing optional fields in JSON export', () => {
    const json = grantsToJSON(mockGrants);
    const parsed = JSON.parse(json);

    expect(parsed.grants[0].release_tx_hash).toBeNull();
    expect(parsed.grants[0].reject_tx_hash).toBeNull();
  });
});
