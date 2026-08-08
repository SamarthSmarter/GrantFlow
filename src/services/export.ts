import { getSandboxGrants, type GrantContractState } from './contract';

/**
 * Export utilities for GrantFlow
 * Provides CSV and JSON export functionality for grant data,
 * used in the Dashboard and Grants listing pages.
 */

/**
 * Convert grant data to CSV string
 */
export function grantsToCSV(grants: GrantContractState[]): string {
  if (grants.length === 0) return '';

  const headers = [
    'Grant ID',
    'Title',
    'Applicant',
    'Grantor Name',
    'Grantor Email',
    'Grantor Address',
    'Amount (XLM)',
    'Status',
    'Milestone Deadline',
    'Milestone Requirements',
    'Submission TX Hash',
    'Timestamp',
  ];

  const escapeCSV = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const rows = grants.map(g => [
    escapeCSV(g.id),
    escapeCSV(g.title),
    escapeCSV(g.applicant),
    escapeCSV(g.grantorName),
    escapeCSV(g.grantorEmail),
    escapeCSV(g.grantorAddress),
    g.amount,
    g.status,
    g.milestoneDeadline,
    escapeCSV(g.milestoneRequirements || ''),
    g.txHash,
    new Date(g.timestamp).toISOString(),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Convert grant data to prettified JSON string
 */
export function grantsToJSON(grants: GrantContractState[]): string {
  const exportData = grants.map(g => ({
    id: g.id,
    title: g.title,
    applicant: g.applicant,
    grantor: {
      name: g.grantorName,
      email: g.grantorEmail,
      address: g.grantorAddress,
    },
    amount_xlm: g.amount,
    status: g.status,
    milestone_deadline: g.milestoneDeadline,
    milestone_requirements: g.milestoneRequirements,
    tx_hash: g.txHash,
    release_tx_hash: g.releaseTxHash || null,
    reject_tx_hash: g.rejectTxHash || null,
    timestamp: new Date(g.timestamp).toISOString(),
  }));

  return JSON.stringify({
    exported_at: new Date().toISOString(),
    total_grants: exportData.length,
    grants: exportData,
  }, null, 2);
}

/**
 * Trigger a browser file download for the given content
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all grants as CSV file download
 */
export function exportGrantsCSV(): void {
  const grants = getSandboxGrants();
  const csv = grantsToCSV(grants);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(csv, `grantflow_export_${timestamp}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export all grants as JSON file download
 */
export function exportGrantsJSON(): void {
  const grants = getSandboxGrants();
  const json = grantsToJSON(grants);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(json, `grantflow_export_${timestamp}.json`, 'application/json');
}

/**
 * Export filtered grants (by status) as CSV
 */
export function exportFilteredGrantsCSV(status: 'pending' | 'funded' | 'rejected'): void {
  const grants = getSandboxGrants().filter(g => g.status === status);
  const csv = grantsToCSV(grants);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(csv, `grantflow_${status}_${timestamp}.csv`, 'text/csv;charset=utf-8;');
}
