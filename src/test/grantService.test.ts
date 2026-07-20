import { describe, it, expect } from 'vitest';
import { validateGrantInput, getGrantById } from '../services/grant';

describe('GrantFlow Service Unit Tests', () => {
  it('should fail validation when grantor name is missing', () => {
    const error = validateGrantInput({
      grantorName: '',
      grantorEmail: 'test@dao.org',
      grantorAddress: 'GBGRANTFLOWTESTADDRESS2026XXXYYYZZZAAA',
      title: 'Test Grant',
      proposal: 'A test proposal',
      amount: '5000',
      milestoneDeadline: '2026-12-31',
      milestoneRequirements: 'M1: done.',
    });
    expect(error).toBe('Grantor / organization name is required');
  });

  it('should fail validation with invalid Stellar address', () => {
    const error = validateGrantInput({
      grantorName: 'Stellar DAO',
      grantorEmail: 'grants@dao.org',
      grantorAddress: 'INVALID_ADDRESS',
      title: 'Test Grant',
      proposal: 'A test proposal',
      amount: '5000',
      milestoneDeadline: '2026-12-31',
      milestoneRequirements: '',
    });
    expect(error).toContain('Invalid Stellar address');
  });

  it('should fail validation when amount is zero or negative', () => {
    const error = validateGrantInput({
      grantorName: 'Stellar DAO',
      grantorEmail: 'grants@dao.org',
      grantorAddress: 'GBGRANTFLOWTESTADDRESS2026XXXYYYZZZAAABBBCCC',
      title: 'Test Grant',
      proposal: 'A proposal',
      amount: '-100',
      milestoneDeadline: '2026-12-31',
      milestoneRequirements: '',
    });
    expect(error).toContain('positive');
  });

  it('should fail validation when milestone deadline is missing', () => {
    const error = validateGrantInput({
      grantorName: 'Stellar DAO',
      grantorEmail: 'grants@dao.org',
      grantorAddress: 'GBGRANTFLOWTESTADDRESS2026XXXYYYZZZAAABBBCCC',
      title: 'Test Grant',
      proposal: 'A proposal',
      amount: '5000',
      milestoneDeadline: '',
      milestoneRequirements: '',
    });
    expect(error).toContain('deadline');
  });

  it('should return undefined when searching for a non-existent grant ID', () => {
    const grant = getGrantById('non-existent-grant-id');
    expect(grant).toBeUndefined();
  });
});
