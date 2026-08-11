/**
 * Status badge metadata and helper utilities for GrantFlow.
 * Provides display metadata (colors, labels, icons) for grant statuses,
 * and helpers for overdue detection and status formatting.
 */

export type GrantStatus = 'pending' | 'funded' | 'rejected';

/**
 * Metadata for a status badge: color scheme, label, and icon name
 */
export interface StatusBadgeMeta {
  status: GrantStatus;
  label: string;
  description: string;
  colorClass: string;       // CSS class for badge background
  textColorClass: string;   // CSS class for text color
  borderColorClass: string; // CSS class for border color
  iconName: string;         // Lucide icon name (string reference)
  dotColor: string;         // Inline dot color (hex or CSS var)
}

const STATUS_META: Record<GrantStatus, StatusBadgeMeta> = {
  pending: {
    status: 'pending',
    label: 'Pending Review',
    description: 'This grant application is awaiting review by the grantor.',
    colorClass: 'bg-amber-500/15',
    textColorClass: 'text-amber-400',
    borderColorClass: 'border-amber-500/30',
    iconName: 'Clock',
    dotColor: '#f59e0b',
  },
  funded: {
    status: 'funded',
    label: 'Milestone Funded',
    description: 'The milestone has been approved and XLM has been disbursed to the applicant.',
    colorClass: 'bg-emerald-500/15',
    textColorClass: 'text-emerald-400',
    borderColorClass: 'border-emerald-500/30',
    iconName: 'CheckCircle2',
    dotColor: '#10b981',
  },
  rejected: {
    status: 'rejected',
    label: 'Withdrawn',
    description: 'This grant application has been withdrawn from the program.',
    colorClass: 'bg-red-500/15',
    textColorClass: 'text-red-400',
    borderColorClass: 'border-red-500/30',
    iconName: 'XCircle',
    dotColor: '#ef4444',
  },
};

/**
 * Get badge metadata for a given grant status.
 * Falls back to 'pending' metadata for unknown statuses.
 */
export function getStatusBadge(status: GrantStatus): StatusBadgeMeta {
  return STATUS_META[status] ?? STATUS_META['pending'];
}

/**
 * Get a human-readable label for a grant status
 */
export function formatGrantStatusLabel(status: GrantStatus): string {
  return STATUS_META[status]?.label ?? 'Unknown';
}

/**
 * Get the description for a grant status
 */
export function getStatusDescription(status: GrantStatus): string {
  return STATUS_META[status]?.description ?? '';
}

/**
 * Determine if a grant milestone deadline has passed.
 * Accepts ISO date strings or Unix timestamp milliseconds.
 *
 * @param deadline - ISO date string (YYYY-MM-DD) or Unix timestamp in ms
 * @returns true if the deadline is in the past
 */
export function isGrantOverdue(deadline: string | number): boolean {
  if (deadline === null || deadline === undefined || deadline === '') return false;
  const deadlineMs = typeof deadline === 'number'
    ? deadline
    : new Date(deadline).getTime();
  return !isNaN(deadlineMs) && deadlineMs < Date.now();
}

/**
 * Get a human-readable relative time string for a deadline.
 * E.g. "3 days overdue" or "in 14 days"
 */
export function formatDeadlineRelative(deadline: string | number): string {
  if (!deadline) return '';
  const deadlineMs = typeof deadline === 'number'
    ? deadline
    : new Date(deadline).getTime();
  if (isNaN(deadlineMs)) return 'Invalid date';

  const diffMs = deadlineMs - Date.now();
  const diffDays = Math.round(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return diffDays === 0 ? 'Overdue today' : `${diffDays} day${diffDays === 1 ? '' : 's'} overdue`;
  }
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `in ${diffDays} days`;
}

/**
 * Compute a priority score for a grant based on status and deadline.
 * Higher scores = higher urgency. Used for sorting in dashboards.
 *
 * Scoring:
 *   - Overdue pending: 100 + (days overdue)
 *   - Pending (not overdue): 50
 *   - Funded: 10
 *   - Rejected: 1
 */
export function getGrantPriorityScore(
  status: GrantStatus,
  deadline: string | number
): number {
  if (status === 'rejected') return 1;
  if (status === 'funded') return 10;

  // Pending
  if (isGrantOverdue(deadline)) {
    const deadlineMs = typeof deadline === 'number' ? deadline : new Date(deadline).getTime();
    const daysOverdue = Math.round((Date.now() - deadlineMs) / (1000 * 60 * 60 * 24));
    return 100 + daysOverdue;
  }
  return 50;
}

/**
 * Get all status options as an array for filter dropdowns
 */
export function getAllStatusOptions(): Array<{ value: GrantStatus | 'all'; label: string }> {
  return [
    { value: 'all', label: 'All Grants' },
    { value: 'pending', label: STATUS_META.pending.label },
    { value: 'funded', label: STATUS_META.funded.label },
    { value: 'rejected', label: STATUS_META.rejected.label },
  ];
}
