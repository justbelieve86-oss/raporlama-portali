const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx}',
  ],
  // darkMode: 'class', // Disabled - dark mode removed
  theme: {
    extend: {
      colors: {
        // Design System Colors
        border: 'hsl(214.3 31.8% 91.4%)',
        input: 'hsl(214.3 31.8% 91.4%)',
        ring: 'hsl(221.2 83.2% 53.3%)',
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222.2 47.4% 11.2%)',
        // Shark color palette for dark mode
        shark: {
          DEFAULT: '#1e1f27',
          50: '#f9fafb',
          100: '#e5e7eb',
          200: '#d1d5db',
          300: '#9ca3af',
          400: '#6b7280',
          500: '#4b5563',
          600: '#374151',
          700: '#2d2e38',
          800: '#252730',
          900: '#1e1f27',
          950: '#111827',
        },
        primary: {
          DEFAULT: '#3b82f6', // colors.primary[500]
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
          foreground: 'hsl(210 40% 98%)',
        },
        secondary: {
          DEFAULT: 'hsl(210 40% 96.1%)',
          foreground: 'hsl(222.2 47.4% 11.2%)',
        },
        success: {
          DEFAULT: '#22c55e', // colors.success[500]
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          DEFAULT: '#f59e0b', // colors.warning[500]
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        error: {
          DEFAULT: '#ef4444', // colors.error[500]
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        info: {
          DEFAULT: '#0ea5e9', // colors.info[500]
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
      },
      fontSize: {
        // Typography scale (Design System)
        'display-2xl': ['4.5rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-xl': ['3.75rem', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-lg': ['3rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
        'display-sm': ['1.875rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' }],
        // Standard headings (optimized line heights)
        h1: ['2.5rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }], // 40px, bold
        h2: ['2rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' }], // 32px, semibold
        h3: ['1.5rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0' }], // 24px, semibold
        h4: ['1.25rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0' }], // 20px, semibold
        h5: ['1.125rem', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '0' }], // 18px, semibold
        h6: ['1rem', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '0' }], // 16px, semibold
        // Body text (optimized line heights)
        body: ['1rem', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '0' }], // 16px, regular
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '0' }], // 14px, regular
        small: ['0.75rem', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '0' }], // 12px, regular
        caption: ['0.75rem', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '0.01em' }],
      },
      fontWeight: {
        // Font weight system
        light: '300',
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      lineHeight: {
        // Line height system
        'heading': '1.2',
        'heading-relaxed': '1.3',
        'body': '1.5',
        'body-relaxed': '1.6',
        'small': '1.4',
      },
      spacing: {
        // Design System Spacing
        xs: '0.25rem',   // 4px
        sm: '0.5rem',    // 8px
        md: '1rem',      // 16px
        lg: '1.5rem',    // 24px
        xl: '2rem',      // 32px
        '2xl': '3rem',   // 48px
        '3xl': '4rem',   // 64px
        '4xl': '6rem',   // 96px
      },
      boxShadow: {
        // Design System Shadows
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        // Design System Border Radius
        'xs': '0.125rem',   // 2px
        'sm': '0.25rem',    // 4px
        'md': '0.375rem',   // 6px
        'lg': '0.5rem',     // 8px
        'xl': '0.75rem',    // 12px
        '2xl': '1rem',      // 16px
        '3xl': '1.5rem',    // 24px
      },
      transitionDuration: {
        // Design System Transitions
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
        'slower': '500ms',
      },
      zIndex: {
        // Design System Z-Index
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1.5rem', // 24px - Consistent container padding
          sm: '1rem',        // 16px - Small screens
          lg: '2rem',        // 32px - Large screens
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },
      gap: {
        // Grid gutters
        'gutter': '1.5rem',   // 24px - Default gutter
        'gutter-sm': '1rem',  // 16px - Small gutter
        'gutter-lg': '2rem',  // 32px - Large gutter
      },
    },
  },
  plugins: [],
};