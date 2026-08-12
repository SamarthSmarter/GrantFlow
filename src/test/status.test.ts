import { describe, it, expect } from 'vitest';
import {
  getStatusBadge,
  formatGrantStatusLabel,
  getStatusDescription,
  isGrantOverdue,
  formatDeadlineRelative,
  getGrantPriorityScore,
  getAllStatusOptions,
  type GrantStatus,
} from '../services/status';

describe('Status Service', () => {
  it('should return correct badge metadata for all statuses', () => {
    const pending = getStatusBadge('pending');
    expect(pending.label).toBe('Pending Review');
    expect(pending.iconName).toBe('Clock');
    expect(pending.colorClass).toContain('amber');

    const funded = getStatusBadge('funded');
    expect(funded.label).toBe('Milestone Funded');
    expect(funded.iconName).toBe('CheckCircle2');
    expect(funded.colorClass).toContain('emerald');

    const rejected = getStatusBadge('rejected');
    expect(rejected.label).toBe('Withdrawn');
    expect(rejected.iconName).toBe('XCircle');
    expect(rejected.colorClass).toContain('red');
  });

  it('should format status labels correctly', () => {
    expect(formatGrantStatusLabel('pending')).toBe('Pending Review');
    expect(formatGrantStatusLabel('funded')).toBe('Milestone Funded');
    expect(formatGrantStatusLabel('rejected')).toBe('Withdrawn');
  });

  it('should return descriptions for all statuses', () => {
    (['pending', 'funded', 'rejected'] as GrantStatus[]).forEach(status => {
      const desc = getStatusDescription(status);
      expect(typeof desc).toBe('string');
      expect(desc.length).toBeGreaterThan(0);
    });
  });

  it('should detect overdue deadlines correctly', () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    expect(isGrantOverdue(past)).toBe(true);
    expect(isGrantOverdue(future)).toBe(false);
    expect(isGrantOverdue('')).toBe(false);
    expect(isGrantOverdue(0)).toBe(true); // epoch 0 is definitely past
  });

  it('should format deadline relative strings', () => {
    const pastMs = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const futureMs = Date.now() + 14 * 24 * 60 * 60 * 1000;

    const past = formatDeadlineRelative(pastMs);
    expect(past).toContain('overdue');

    const future = formatDeadlineRelative(futureMs);
    expect(future).toContain('in');
    expect(future).toContain('14');

    expect(formatDeadlineRelative('')).toBe('');
  });

  it('should compute priority scores correctly', () => {
    const futureDeadline = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const pastDeadline = Date.now() - 5 * 24 * 60 * 60 * 1000;

    const overdueScore = getGrantPriorityScore('pending', pastDeadline);
    const pendingScore = getGrantPriorityScore('pending', futureDeadline);
    const fundedScore = getGrantPriorityScore('funded', futureDeadline);
    const rejectedScore = getGrantPriorityScore('rejected', futureDeadline);

    expect(overdueScore).toBeGreaterThan(100);
    expect(pendingScore).toBe(50);
    expect(fundedScore).toBe(10);
    expect(rejectedScore).toBe(1);
    expect(overdueScore).toBeGreaterThan(pendingScore);
  });

  it('should return all status options including all filter', () => {
    const options = getAllStatusOptions();
    expect(options).toHaveLength(4);
    expect(options[0].value).toBe('all');
    const values = options.map(o => o.value);
    expect(values).toContain('pending');
    expect(values).toContain('funded');
    expect(values).toContain('rejected');
  });
});
