import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.e2e.*',
      '**/e2e/**/*.spec.ts',
      '**/e2e/**/*.spec.js',
      'e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/types/**',
        '**/providers/**',
        '**/layouts/**',
        '**/pages/**',
        '**/components/**', // Exclude components from coverage (tested via integration tests)
        '**/hooks/**', // Exclude hooks (tested via component tests)
        '**/scripts/**',
      ],
      thresholds: {
        lines: 25,
        functions: 25,
        branches: 25,
        statements: 25,
        // Per-file thresholds for tested utilities
        'src/lib/logger.ts': { lines: 50, functions: 50, branches: 50, statements: 50 },
        'src/lib/formatUtils.ts': { lines: 80, functions: 80, branches: 80, statements: 80 },
        'src/lib/errorUtils.ts': { lines: 80, functions: 80, branches: 80, statements: 80 },
        'src/utils/toast.ts': { lines: 80, functions: 80, branches: 80, statements: 80 },
        'src/utils/apiList.ts': { lines: 80, functions: 80, branches: 80, statements: 80 },
        'src/utils/kpiPayload.ts': { lines: 80, functions: 80, branches: 80, statements: 80 },
        'src/services/api.ts': { lines: 30, functions: 30, branches: 30, statements: 30 },
      },
    },
  },
});