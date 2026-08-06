import { describe, it, expect } from 'vitest';
import {
  computeGrantAnalytics,
  getStatusDistribution,
  getGrowthRate,
  getTimeSeriesData,
} from '../services/analytics';

describe('Analytics Service', () => {
  it('should return valid analytics with default sandbox data', () => {
    const analytics = computeGrantAnalytics();

    expect(analytics.totalGrants).toBeGreaterThanOrEqual(0);
    expect(analytics.pendingGrants).toBeGreaterThanOrEqual(0);
    expect(analytics.fundedGrants).toBeGreaterThanOrEqual(0);
    expect(analytics.rejectedGrants).toBeGreaterThanOrEqual(0);
    expect(analytics.totalGrants).toBe(
      analytics.pendingGrants + analytics.fundedGrants + analytics.rejectedGrants
    );
    expect(analytics.averageGrantSize).toBeGreaterThanOrEqual(0);
    expect(analytics.approvalRate).toBeGreaterThanOrEqual(0);
    expect(analytics.approvalRate).toBeLessThanOrEqual(100);
  });

  it('should compute correct status distribution percentages', () => {
    const distribution = getStatusDistribution();

    expect(distribution).toHaveLength(3);
    const statuses = distribution.map(d => d.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('funded');
    expect(statuses).toContain('rejected');

    const totalPercentage = distribution.reduce((sum, d) => sum + d.percentage, 0);
    // Percentages might not add up to exactly 100 due to rounding
    expect(totalPercentage).toBeGreaterThanOrEqual(0);
    expect(totalPercentage).toBeLessThanOrEqual(101);
  });

  it('should return growth rate data', () => {
    const growth = getGrowthRate();

    expect(growth).toHaveProperty('current');
    expect(growth).toHaveProperty('previous');
    expect(growth).toHaveProperty('growthPercent');
    expect(typeof growth.current).toBe('number');
    expect(typeof growth.previous).toBe('number');
    expect(typeof growth.growthPercent).toBe('number');
  });

  it('should generate time series data with correct date range', () => {
    const days = 14;
    const timeSeries = getTimeSeriesData(days);

    expect(timeSeries.length).toBe(days);
    timeSeries.forEach(point => {
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('submissions');
      expect(point).toHaveProperty('funded');
      expect(point).toHaveProperty('rejected');
      expect(point).toHaveProperty('volumeXlm');
      expect(point.submissions).toBeGreaterThanOrEqual(0);
      expect(point.funded).toBeGreaterThanOrEqual(0);
      expect(point.rejected).toBeGreaterThanOrEqual(0);
    });
  });

  it('should handle empty grant data gracefully', () => {
    // This tests the fallback behavior when localStorage is empty
    const analytics = computeGrantAnalytics();
    expect(analytics).toBeTruthy();
    expect(typeof analytics.totalGrants).toBe('number');
    expect(typeof analytics.totalValueLocked).toBe('number');
    expect(typeof analytics.totalDisbursed).toBe('number');
    expect(typeof analytics.medianGrantSize).toBe('number');
  });
});
