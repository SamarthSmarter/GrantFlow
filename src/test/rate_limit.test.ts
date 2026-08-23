import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isRateLimitAllowed,
  recordCall,
  getRemainingCalls,
  getResetTimeMs,
  resetRateLimit,
} from '../services/rate_limit';

describe('Rate Limit Service', () => {
  beforeEach(() => {
    resetRateLimit('submitGrant');
    resetRateLimit('releaseMilestone');
    resetRateLimit('testAction');
  });

  it('should allow calls within rate limit', () => {
    expect(isRateLimitAllowed('submitGrant')).toBe(true);
    recordCall('submitGrant');
    expect(isRateLimitAllowed('submitGrant')).toBe(true);
  });

  it('should block calls when rate limit is exceeded', () => {
    // submitGrant allows 3 per minute
    for (let i = 0; i < 3; i++) {
      expect(isRateLimitAllowed('submitGrant')).toBe(true);
      recordCall('submitGrant');
    }
    expect(isRateLimitAllowed('submitGrant')).toBe(false);
  });

  it('should report correct remaining calls', () => {
    expect(getRemainingCalls('submitGrant')).toBe(3);
    recordCall('submitGrant');
    expect(getRemainingCalls('submitGrant')).toBe(2);
    recordCall('submitGrant');
    expect(getRemainingCalls('submitGrant')).toBe(1);
  });

  it('should return 0 reset time when not rate limited', () => {
    expect(getResetTimeMs('submitGrant')).toBe(0);
  });

  it('should return positive reset time when rate limited', () => {
    for (let i = 0; i < 3; i++) {
      recordCall('submitGrant');
    }
    const resetMs = getResetTimeMs('submitGrant');
    expect(resetMs).toBeGreaterThan(0);
    expect(resetMs).toBeLessThanOrEqual(60_000);
  });

  it('should expire calls after the window passes', async () => {
    vi.useFakeTimers();

    for (let i = 0; i < 3; i++) {
      recordCall('submitGrant');
    }
    expect(isRateLimitAllowed('submitGrant')).toBe(false);

    // Advance time past the 1-minute window
    vi.advanceTimersByTime(61_000);
    expect(isRateLimitAllowed('submitGrant')).toBe(true);

    vi.useRealTimers();
  });

  it('should handle different actions independently', () => {
    for (let i = 0; i < 3; i++) {
      recordCall('submitGrant');
    }
    expect(isRateLimitAllowed('submitGrant')).toBe(false);
    expect(isRateLimitAllowed('releaseMilestone')).toBe(true);
  });
});
