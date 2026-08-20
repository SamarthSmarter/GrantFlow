import { describe, it, expect } from 'vitest';
import {
  isValidStellarAddress,
  isValidContractId,
  isValidEmail,
  validateAmount,
  sanitizeInput,
  isValidFutureDate,
  isValidGrantId,
  formatStellarAddress,
  xlmToStroops,
  stroopsToXlm,
} from '../services/validation';

describe('Validation Utilities', () => {
  describe('isValidStellarAddress', () => {
    it('should accept valid G-addresses', () => {
      expect(isValidStellarAddress('GBJCHUKZMTFSLKFBZZERMQZ4RWWQQW2ZZ5D2U462TDKZZX3Q77PZWZ22')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidStellarAddress('')).toBe(false);
      expect(isValidStellarAddress('INVALID')).toBe(false);
      expect(isValidStellarAddress('C' + 'A'.repeat(55))).toBe(false);
      expect(isValidStellarAddress('G' + 'A'.repeat(54))).toBe(false);
    });
  });

  describe('isValidContractId', () => {
    it('should accept valid C-addresses', () => {
      expect(isValidContractId('CC7VVKTGVSRNEZ4NGWL4AZBKXA6WIVPROT46J23M37FAZULUIYMS73UW')).toBe(true);
    });

    it('should reject non-contract IDs', () => {
      expect(isValidContractId('')).toBe(false);
      expect(isValidContractId('GBJCHUKZMTFSLKFBZZERMQZ4RWWQQW2ZZ5D2U462TDKZZX3Q77PZWZ22')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@missing.com')).toBe(false);
    });
  });

  describe('validateAmount', () => {
    it('should accept valid positive amounts', () => {
      expect(validateAmount('1000')).toBeNull();
      expect(validateAmount('0.0001')).toBeNull();
      expect(validateAmount('99999.1234567')).toBeNull();
    });

    it('should reject zero and negative amounts', () => {
      expect(validateAmount('0')).toContain('greater than zero');
      expect(validateAmount('-100')).toContain('greater than zero');
    });

    it('should reject non-numeric values', () => {
      expect(validateAmount('abc')).toContain('valid number');
      expect(validateAmount('')).toContain('required');
    });

    it('should reject excessive decimal places', () => {
      expect(validateAmount('1.12345678')).toContain('7 decimal');
    });

    it('should reject unreasonably large amounts', () => {
      expect(validateAmount('999999999999')).toContain('exceeds');
    });

    it('should reject Infinity as an invalid number', () => {
      expect(validateAmount('Infinity')).toContain('valid number');
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should strip angle brackets', () => {
      expect(sanitizeInput('<script>alert(1)</script>')).not.toContain('<');
      expect(sanitizeInput('<script>alert(1)</script>')).not.toContain('>');
    });

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should strip leading = to prevent CSV formula injection', () => {
      expect(sanitizeInput('=HYPERLINK("evil.com")')).not.toMatch(/^=/);
    });

    it('should strip leading + sign to prevent CSV formula injection', () => {
      expect(sanitizeInput('+SUM(A1:A10)')).not.toMatch(/^\+/);
    });

    it('should strip leading @ sign to prevent CSV formula injection', () => {
      expect(sanitizeInput('@SUM(A1)')).not.toMatch(/^@/);
    });

    it('should preserve normal grant titles', () => {
      const title = 'DeFi Analytics Dashboard v2';
      expect(sanitizeInput(title)).toBe(title);
    });
  });

  describe('isValidGrantId', () => {
    it('should accept valid grant IDs', () => {
      expect(isValidGrantId('grt_abc123xyz')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidGrantId('')).toBe(false);
      expect(isValidGrantId('inv_123')).toBe(false);
      expect(isValidGrantId('grt_')).toBe(false);
    });
  });

  describe('formatStellarAddress', () => {
    it('should truncate long addresses', () => {
      const addr = 'GBJCHUKZMTFSLKFBZZERMQZ4RWWQQW2ZZ5D2U462TDKZZX3Q77PZWZ22';
      const formatted = formatStellarAddress(addr);
      expect(formatted).toBe('GBJCHU...PZWZ22');
    });

    it('should return empty string for null', () => {
      expect(formatStellarAddress(null)).toBe('');
    });
  });

  describe('xlmToStroops / stroopsToXlm', () => {
    it('should convert XLM to stroops correctly', () => {
      expect(xlmToStroops('1')).toBe(BigInt(10_000_000));
      expect(xlmToStroops('100.5')).toBe(BigInt(1_005_000_000));
    });

    it('should convert stroops to XLM correctly', () => {
      expect(stroopsToXlm(10_000_000)).toBe('1.0000');
      expect(stroopsToXlm(BigInt(50_000_000))).toBe('5.0000');
    });

    it('should handle invalid inputs gracefully', () => {
      expect(xlmToStroops('')).toBe(BigInt(0));
      expect(xlmToStroops('-5')).toBe(BigInt(0));
    });
  });

  describe('isValidFutureDate', () => {
    it('should accept valid near-future dates', () => {
      const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      expect(isValidFutureDate(nextYear)).toBe(true);
    });

    it('should reject past dates', () => {
      expect(isValidFutureDate('2020-01-01')).toBe(false);
      expect(isValidFutureDate('1970-01-01')).toBe(false);
    });

    it('should reject dates more than 10 years in the future', () => {
      const farFuture = new Date(Date.now() + 11 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      expect(isValidFutureDate(farFuture)).toBe(false);
    });

    it('should reject empty or invalid strings', () => {
      expect(isValidFutureDate('')).toBe(false);
      expect(isValidFutureDate('not-a-date')).toBe(false);
    });
  });
});
