/**
 * Number formatting utilities
 * Turkish format: binlik ayırıcı nokta (.), ondalık ayırıcı virgül (,)
 */

export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0';
  }
  const hasFraction = amount % 1 !== 0;
  if (!hasFraction) {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Parse a Turkish-formatted number string to a number
 * Accepts both comma (,) and dot (.) as decimal separator
 * Removes thousand separators (dots)
 * @param value - The string value to parse (e.g., "1.234,56" or "1234,56" or "1234.56")
 * @returns The parsed number or null if invalid
 */
export function parseNumberInput(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  // Remove all thousand separators (dots that are not decimal separators)
  // Strategy: Find the last comma or dot - that's the decimal separator
  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');
  
  let cleanValue: string;
  if (lastComma > lastDot) {
    // Comma is the decimal separator
    // Remove all dots (thousand separators) and replace comma with dot
    cleanValue = value.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Dot is the decimal separator (legacy format)
    // Remove all other dots (thousand separators) - keep only the last one
    const parts = value.split('.');
    if (parts.length > 1) {
      // Last part is decimal, all others are thousands
      cleanValue = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    } else {
      cleanValue = value;
    }
  } else {
    // No decimal separator, just remove dots (thousand separators)
    cleanValue = value.replace(/\./g, '');
  }
  
  const num = Number(cleanValue);
  return isNaN(num) ? null : num;
}

/**
 * Format number for input display (with Turkish format: comma as decimal separator)
 * Used when input is not focused - shows formatted value
 * @param value - The number value to format
 * @returns Formatted string (e.g., "1.234,56")
 */
export function formatNumberForInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return formatNumber(value);
}

/**
 * Format number for input when focused (raw format for easier editing)
 * Shows number without thousand separators, with comma as decimal separator
 * @param value - The number value to format
 * @returns Raw formatted string (e.g., "1234,56")
 */
export function formatNumberForInputFocused(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  
  const hasFraction = value % 1 !== 0;
  if (hasFraction) {
    // Show with comma as decimal separator, no thousand separators
    return value.toString().replace('.', ',');
  }
  return value.toString();
}

