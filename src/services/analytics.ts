import { getSandboxGrants, getSandboxEvents, type GrantContractState, type ContractEvent } from './contract';

/**
 * Analytics service for GrantFlow
 * Computes grant statistics, category breakdowns, and time-series data
 * used by the Analytics Dashboard page.
 */

export interface GrantAnalytics {
  totalGrants: number;
  pendingGrants: number;
  fundedGrants: number;
  rejectedGrants: number;
  totalValueLocked: number;       // Total XLM across all pending grants
  totalDisbursed: number;         // Total XLM released to funded grants
  averageGrantSize: number;       // Average grant amount in XLM
  approvalRate: number;           // Percentage of grants that got funded
  medianGrantSize: number;        // Median grant amount in XLM
  largestGrant: GrantContractState | null;
  smallestGrant: GrantContractState | null;
  recentActivity: ContractEvent[];
}

export interface TimeSeriesDataPoint {
  date: string;           // ISO date string (YYYY-MM-DD)
  submissions: number;
  funded: number;
  rejected: number;
  volumeXlm: number;
}

export interface StatusDistribution {
  status: 'pending' | 'funded' | 'rejected';
  count: number;
  percentage: number;
  totalXlm: number;
}

/**
 * Compute comprehensive analytics from current grant data
 */
export function computeGrantAnalytics(): GrantAnalytics {
  const grants = getSandboxGrants();
  const events = getSandboxEvents();

  const pendingGrants = grants.filter(g => g.status === 'pending');
  const fundedGrants = grants.filter(g => g.status === 'funded');
  const rejectedGrants = grants.filter(g => g.status === 'rejected');

  const amounts = grants.map(g => parseFloat(g.amount) || 0);
  const totalValue = amounts.reduce((sum, val) => sum + val, 0);
  const totalDisbursed = fundedGrants
    .map(g => parseFloat(g.amount) || 0)
    .reduce((sum, val) => sum + val, 0);
  const totalValueLocked = pendingGrants
    .map(g => parseFloat(g.amount) || 0)
    .reduce((sum, val) => sum + val, 0);

  const sortedAmounts = [...amounts].sort((a, b) => a - b);
  const medianGrantSize = sortedAmounts.length > 0
    ? sortedAmounts.length % 2 === 0
      ? (sortedAmounts[sortedAmounts.length / 2 - 1] + sortedAmounts[sortedAmounts.length / 2]) / 2
      : sortedAmounts[Math.floor(sortedAmounts.length / 2)]
    : 0;

  const nonRejectedGrants = grants.filter(g => g.status !== 'rejected');
  const approvalRate = nonRejectedGrants.length > 0
    ? (fundedGrants.length / (fundedGrants.length + rejectedGrants.length)) * 100
    : 0;

  // Find largest and smallest grants
  let largestGrant: GrantContractState | null = null;
  let smallestGrant: GrantContractState | null = null;
  if (grants.length > 0) {
    largestGrant = grants.reduce((max, g) =>
      (parseFloat(g.amount) || 0) > (parseFloat(max.amount) || 0) ? g : max
    );
    smallestGrant = grants.reduce((min, g) =>
      (parseFloat(g.amount) || 0) < (parseFloat(min.amount) || 0) ? g : min
    );
  }

  // Get recent activity (last 10 events)
  const recentActivity = events.slice(0, 10);

  return {
    totalGrants: grants.length,
    pendingGrants: pendingGrants.length,
    fundedGrants: fundedGrants.length,
    rejectedGrants: rejectedGrants.length,
    totalValueLocked,
    totalDisbursed,
    averageGrantSize: grants.length > 0 ? totalValue / grants.length : 0,
    approvalRate: isNaN(approvalRate) ? 0 : approvalRate,
    medianGrantSize,
    largestGrant,
    smallestGrant,
    recentActivity,
  };
}

/**
 * Generate time-series data for grant activity over the past N days
 */
export function getTimeSeriesData(daysBack: number = 30): TimeSeriesDataPoint[] {
  const events = getSandboxEvents();
  const now = Date.now();
  const startTime = now - daysBack * 24 * 60 * 60 * 1000;

  // Create date buckets
  const buckets = new Map<string, TimeSeriesDataPoint>();
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(startTime + i * 24 * 60 * 60 * 1000);
    const key = date.toISOString().split('T')[0];
    buckets.set(key, {
      date: key,
      submissions: 0,
      funded: 0,
      rejected: 0,
      volumeXlm: 0,
    });
  }

  // Populate buckets from events
  for (const event of events) {
    if (event.timestamp < startTime) continue;
    const dateKey = new Date(event.timestamp).toISOString().split('T')[0];
    const bucket = buckets.get(dateKey);
    if (!bucket) continue;

    const amount = parseFloat(event.amount) || 0;

    if (event.type === 'submitted') {
      bucket.submissions++;
      bucket.volumeXlm += amount;
    } else if (event.type === 'funded') {
      bucket.funded++;
      bucket.volumeXlm += amount;
    } else if (event.type === 'rejected') {
      bucket.rejected++;
    }
  }

  return Array.from(buckets.values());
}

/**
 * Get status distribution for pie/donut chart visualization
 */
export function getStatusDistribution(): StatusDistribution[] {
  const grants = getSandboxGrants();
  const total = grants.length;

  if (total === 0) {
    return [
      { status: 'pending', count: 0, percentage: 0, totalXlm: 0 },
      { status: 'funded', count: 0, percentage: 0, totalXlm: 0 },
      { status: 'rejected', count: 0, percentage: 0, totalXlm: 0 },
    ];
  }

  const statusGroups: Record<string, GrantContractState[]> = {
    pending: [],
    funded: [],
    rejected: [],
  };

  grants.forEach(g => {
    if (statusGroups[g.status]) {
      statusGroups[g.status].push(g);
    }
  });

  return (['pending', 'funded', 'rejected'] as const).map(status => {
    const group = statusGroups[status];
    const totalXlm = group.reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);
    return {
      status,
      count: group.length,
      percentage: Math.round((group.length / total) * 100),
      totalXlm,
    };
  });
}

/**
 * Calculate month-over-month growth rate for grant submissions
 */
export function getGrowthRate(): { current: number; previous: number; growthPercent: number } {
  const events = getSandboxEvents();
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

  const currentPeriod = events.filter(
    e => e.type === 'submitted' && e.timestamp >= thirtyDaysAgo
  ).length;

  const previousPeriod = events.filter(
    e => e.type === 'submitted' && e.timestamp >= sixtyDaysAgo && e.timestamp < thirtyDaysAgo
  ).length;

  const growthPercent = previousPeriod > 0
    ? ((currentPeriod - previousPeriod) / previousPeriod) * 100
    : currentPeriod > 0 ? 100 : 0;

  return { current: currentPeriod, previous: previousPeriod, growthPercent };
}
