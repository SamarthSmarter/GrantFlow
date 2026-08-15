/**
 * Centralized validation and sanitization utilities for GrantFlow
 * Provides reusable validation functions for Stellar addresses,
 * amounts, form inputs, and contract IDs.
 */

/**
 * Validate a Stellar public key (G... address)
 */
export function isValidStellarAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return /^G[A-Z2-7]{55}$/.test(address.trim());
}

/**
 * Validate a Soroban contract ID (C... address)
 */
export function isValidContractId(contractId: string): boolean {
  if (!contractId || typeof contractId !== 'string') return false;
  return /^C[A-Z2-7]{55}$/.test(contractId.trim());
}

/**
 * Validate an email address
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate a positive XLM amount string
 * Returns null if valid, or an error message string if invalid
 */
export function validateAmount(amount: string): string | null {
  if (!amount || typeof amount !== 'string') {
    return 'Amount is required';
  }

  const trimmed = amount.trim();
  if (trimmed === '') {
    return 'Amount is required';
  }

  const parsed = parseFloat(trimmed);
  if (isNaN(parsed) || !isFinite(parsed)) {
    return 'Amount must be a valid number';
  }

  if (parsed <= 0) {
    return 'Amount must be greater than zero';
  }

  if (parsed > 1_000_000_000) {
    return 'Amount exceeds maximum allowed value';
  }

  // Check for excessive decimals (Stellar supports 7 decimal places)
  const parts = trimmed.split('.');
  if (parts.length === 2 && parts[1].length > 7) {
    return 'Amount cannot have more than 7 decimal places (Stroops precision)';
  }

  return null;
}

/**
 * Sanitize a text input string by trimming and removing dangerous characters.
 * Also strips CSV formula injection characters (=, +, -, @) at the start of the string.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '')      // Strip angle brackets to prevent XSS
    .replace(/\0/g, '')        // Strip null bytes
    .replace(/^[=+\-@]/, ''); // Prevent CSV formula injection
}

/**
 * Validate a Unix timestamp or ISO date string
 * Returns true if the date is valid and in the future.
 * Rejects dates more than 10 years in the future (likely a data-entry error).
 */
export function isValidFutureDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const now = Date.now();
  const tenYearsMs = 10 * 365.25 * 24 * 60 * 60 * 1000;
  return date.getTime() > now && date.getTime() < now + tenYearsMs;
}

/**
 * Validate a grant ID format
 */
export function isValidGrantId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^grt_[a-z0-9]{6,20}$/.test(id.trim());
}

/**
 * Format a Stellar address for display (truncated with ellipsis)
 */
export function formatStellarAddress(address: string | null, chars: number = 6): string {
  if (!address) return '';
  if (address.length <= chars * 2) return address;
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
}

/**
 * Parse XLM amount string to stroops (integer)
 */
export function xlmToStroops(xlm: string): bigint {
  const amount = parseFloat(xlm);
  if (isNaN(amount) || amount < 0) return BigInt(0);
  return BigInt(Math.round(amount * 10_000_000));
}

/**
 * Convert stroops to XLM display string
 */
export function stroopsToXlm(stroops: number | bigint): string {
  const num = typeof stroops === 'bigint' ? Number(stroops) : stroops;
  return (num / 10_000_000).toFixed(4);
}
