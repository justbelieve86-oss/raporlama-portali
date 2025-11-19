/**
 * Design System Tokens
 * 
 * Bu dosya projenin tüm design token'larını içerir.
 * Renkler, spacing, typography, shadows ve diğer design değerleri burada tanımlanır.
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Ana renk
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Ana renk
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Ana renk
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Ana renk
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Ana renk
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
} as const;

// Semantic color mappings
export const semanticColors = {
  success: {
    light: colors.success[100],
    main: colors.success[500],
    dark: colors.success[700],
  },
  warning: {
    light: colors.warning[100],
    main: colors.warning[500],
    dark: colors.warning[700],
  },
  error: {
    light: colors.error[100],
    main: colors.error[500],
    dark: colors.error[700],
  },
  info: {
    light: colors.info[100],
    main: colors.info[500],
    dark: colors.info[700],
  },
} as const;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

export const typography = {
  h1: {
    fontSize: '2.5rem',    // 40px
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',     // 32px
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.5rem',   // 24px
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0',
  },
  h4: {
    fontSize: '1.25rem',  // 20px
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0',
  },
  h5: {
    fontSize: '1.125rem', // 18px
    fontWeight: 600,
    lineHeight: 1.5,
    letterSpacing: '0',
  },
  h6: {
    fontSize: '1rem',     // 16px
    fontWeight: 600,
    lineHeight: 1.5,
    letterSpacing: '0',
  },
  body: {
    fontSize: '1rem',    // 16px
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0',
  },
  bodySmall: {
    fontSize: '0.875rem', // 14px
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0',
  },
  small: {
    fontSize: '0.75rem',  // 12px
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: '0',
  },
  caption: {
    fontSize: '0.75rem',  // 12px
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '0.01em',
  },
} as const;

// Font weights
export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ============================================================================
// SHADOW SYSTEM
// ============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  fast: '150ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '300ms ease-in-out',
  slower: '500ms ease-in-out',
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ============================================================================
// BREAKPOINTS (Tailwind default, referans için)
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Typography class'larını oluşturur
 */
export function getTypographyClass(variant: keyof typeof typography): string {
  const style = typography[variant];
  return `text-[${style.fontSize}] font-[${style.fontWeight}] leading-[${style.lineHeight}] tracking-[${style.letterSpacing}]`;
}

/**
 * Shadow class'ını oluşturur
 */
export function getShadowClass(shadow: keyof typeof shadows): string {
  return `shadow-${shadow}`;
}

/**
 * Spacing class'ını oluşturur
 */
export function getSpacingClass(size: keyof typeof spacing): string {
  return spacing[size];
}

/**
 * Color class'ını oluşturur
 */
export function getColorClass(
  colorName: keyof typeof colors,
  shade: keyof typeof colors.primary
): string {
  return `text-${colorName}-${shade}`;
}

