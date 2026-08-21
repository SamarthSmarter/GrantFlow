/**
 * Client-side grant search and filter utilities for GrantFlow.
 * Provides fuzzy text matching, multi-field filtering, and sort capabilities
 * for the grants list dashboard.
 */

import { getSandboxGrants, type GrantContractState } from './contract';

export type SortField = 'amount' | 'deadline' | 'status' | 'created';
export type SortDirection = 'asc' | 'desc';

export interface GrantSearchQuery {
  text?: string;               // Free-text search across title, proposal, grantor name
  status?: string;             // Filter by status: 'pending' | 'funded' | 'rejected' | 'all'
  minAmount?: number;          // Minimum grant amount in XLM
  maxAmount?: number;          // Maximum grant amount in XLM
  grantorAddress?: string;     // Filter by specific grantor address
  sortField?: SortField;
  sortDirection?: SortDirection;
  limit?: number;              // Max results to return (pagination)
  offset?: number;             // Offset for pagination
}

export interface GrantSearchResult {
  grants: GrantContractState[];
  total: number;               // Total matching grants (before pagination)
  page: number;
  pageSize: number;
}

/**
 * Perform a case-insensitive fuzzy search across title, proposal, and grantor name fields.
 */
function matchesText(grant: GrantContractState, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  return (
    grant.title.toLowerCase().includes(q) ||
    grant.proposal.toLowerCase().includes(q) ||
    grant.grantorName.toLowerCase().includes(q) ||
    grant.id.toLowerCase().includes(q)
  );
}

/**
 * Search and filter grants with full query support.
 * All filters are applied in sequence.
 */
export function searchGrants(query: GrantSearchQuery): GrantSearchResult {
  let grants = getSandboxGrants();

  // Text filter
  if (query.text) {
    grants = grants.filter(g => matchesText(g, query.text!));
  }

  // Status filter
  if (query.status && query.status !== 'all') {
    grants = grants.filter(g => g.status === query.status);
  }

  // Amount range filter
  if (query.minAmount !== undefined) {
    grants = grants.filter(g => parseFloat(g.amount) >= query.minAmount!);
  }
  if (query.maxAmount !== undefined) {
    grants = grants.filter(g => parseFloat(g.amount) <= query.maxAmount!);
  }

  // Grantor filter
  if (query.grantorAddress) {
    grants = grants.filter(g => g.grantorAddress === query.grantorAddress);
  }

  const total = grants.length;

  // Sorting
  const sortField = query.sortField ?? 'created';
  const sortDir = query.sortDirection ?? 'desc';

  grants = [...grants].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case 'amount':
        cmp = parseFloat(a.amount) - parseFloat(b.amount);
        break;
      case 'deadline':
        cmp = (a.milestoneDeadline ?? '').localeCompare(b.milestoneDeadline ?? '');
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
      case 'created':
      default:
        cmp = (a.id ?? '').localeCompare(b.id ?? '');
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // Pagination
  const pageSize = query.limit ?? 10;
  const offset = query.offset ?? 0;
  const page = Math.floor(offset / pageSize) + 1;
  const paginatedGrants = grants.slice(offset, offset + pageSize);

  return {
    grants: paginatedGrants,
    total,
    page,
    pageSize,
  };
}

/**
 * Get all unique grantor names for use in autocomplete and filter dropdowns
 */
export function getUniqueGrantors(): Array<{ name: string; address: string }> {
  const grants = getSandboxGrants();
  const seen = new Set<string>();
  const result: Array<{ name: string; address: string }> = [];
  for (const g of grants) {
    if (!seen.has(g.grantorAddress)) {
      seen.add(g.grantorAddress);
      result.push({ name: g.grantorName, address: g.grantorAddress });
    }
  }
  return result;
}

/**
 * Quick count: how many grants match a given status
 */
export function countGrantsByStatus(status: string): number {
  const grants = getSandboxGrants();
  return grants.filter(g => g.status === status).length;
}
