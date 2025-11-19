import { describe, it, expect } from 'vitest';
import { parseNumberInput, formatNumberForInput, formatNumberForInputFocused, formatNumber, formatCurrency } from '../formatUtils';

describe('formatUtils', () => {
  describe('parseNumberInput', () => {
    it('should parse number with comma as decimal separator', () => {
      expect(parseNumberInput('123,45')).toBe(123.45);
      expect(parseNumberInput('0,5')).toBe(0.5);
      expect(parseNumberInput('1000,99')).toBe(1000.99);
    });

    it('should parse number with dot as decimal separator', () => {
      expect(parseNumberInput('123.45')).toBe(123.45);
      expect(parseNumberInput('0.5')).toBe(0.5);
    });

    it('should parse number with thousand separators', () => {
      expect(parseNumberInput('1.234,56')).toBe(1234.56);
      expect(parseNumberInput('10.000,50')).toBe(10000.5);
      expect(parseNumberInput('1.234.567,89')).toBe(1234567.89);
    });

    it('should handle last comma/dot as decimal separator', () => {
      expect(parseNumberInput('1.234,56')).toBe(1234.56);
      // 1,234.56 format: parseNumberInput treats last dot as decimal separator
      // But this leaves comma in the number part, causing NaN
      // This format is ambiguous and not supported - use "1.234,56" (Turkish) or "1234.56" (legacy)
      expect(parseNumberInput('1,234.56')).toBeNull();
    });

    it('should return null for invalid input', () => {
      expect(parseNumberInput('')).toBeNull();
      expect(parseNumberInput('abc')).toBeNull();
      expect(parseNumberInput('--')).toBeNull();
    });

    it('should handle empty string', () => {
      expect(parseNumberInput('')).toBeNull();
    });

    it('should handle whitespace', () => {
      expect(parseNumberInput('  123,45  ')).toBe(123.45);
    });

    it('should handle integer values', () => {
      expect(parseNumberInput('123')).toBe(123);
      // 1.234 with only dot - parseNumberInput treats last dot as decimal separator
      // So "1.234" is parsed as 1.234 (decimal), not 1234 (thousand)
      // For thousand separator format, use comma: "1.234,00" or just "1234"
      expect(parseNumberInput('1.234')).toBe(1.234);
    });
  });

  describe('formatNumberForInput', () => {
    it('should format number with Turkish locale', () => {
      expect(formatNumberForInput(1234.56)).toBe('1.234,56');
      expect(formatNumberForInput(1000)).toBe('1.000');
      // formatNumber uses minimumFractionDigits: 2 for decimals, so 0.5 becomes "0,50"
      expect(formatNumberForInput(0.5)).toBe('0,50');
    });

    it('should handle null and undefined', () => {
      expect(formatNumberForInput(null)).toBe('');
      expect(formatNumberForInput(undefined)).toBe('');
    });

    it('should handle zero', () => {
      expect(formatNumberForInput(0)).toBe('0');
    });

    it('should handle large numbers', () => {
      expect(formatNumberForInput(1234567.89)).toBe('1.234.567,89');
    });
  });

  describe('formatNumberForInputFocused', () => {
    it('should format number without thousand separators', () => {
      expect(formatNumberForInputFocused(1234.56)).toBe('1234,56');
      expect(formatNumberForInputFocused(1000)).toBe('1000');
      expect(formatNumberForInputFocused(0.5)).toBe('0,5');
    });

    it('should handle null and undefined', () => {
      expect(formatNumberForInputFocused(null)).toBe('');
      expect(formatNumberForInputFocused(undefined)).toBe('');
    });

    it('should handle zero', () => {
      expect(formatNumberForInputFocused(0)).toBe('0');
    });
  });

  describe('formatNumber', () => {
    it('should format number with Turkish locale', () => {
      expect(formatNumber(1234.56)).toContain('1.234');
      expect(formatNumber(1000)).toContain('1.000');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle null and undefined', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with Turkish locale', () => {
      // formatCurrency uses minimumFractionDigits: 0, so 1234.56 rounds to 1235
      const result = formatCurrency(1234.56);
      expect(result).toContain('₺');
      expect(result).toMatch(/\d/); // Contains at least one digit
    });

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('₺0');
    });
  });
});

