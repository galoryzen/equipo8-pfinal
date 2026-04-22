import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    setupFiles: ['./vitest.setup.ts'],
    environment: 'jsdom',
    globals: true,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: [
        'app/**/*.ts',
        'app/**/*.tsx',
        'app/**/*.js',
        'app/**/*.jsx',
        'components/manager/**/*.ts',
        'components/manager/**/*.tsx',
      ],
      exclude: [
        // Layouts — pure wrappers with no testable logic
        'app/layout.tsx',
        'app/**/layout.tsx',
        // Theme / config — no logic
        'app/theme.ts',
        // Not-found fallback — single JSX expression, nothing to assert
        'app/not-found.tsx',
        // Stub pages — placeholder content only, nothing to test.
        // Use **/<segment>/** instead of literal (auth)/(protected) paths
        // because micromatch treats bare parentheses as extglob delimiters.
        '**/login/manager/**',
        '**/register/manager/**',
        'app/manager/page.tsx',
        'app/manager/hotel/**',
        // Protected traveler stubs (thin page wrappers, no isolated logic)
        'app/traveler/**/my-trips/**',
        'app/traveler/**/booking/page.tsx',
        'app/traveler/hotel/**',
        // Auth hook — bootstrapped by the auth library, not unit-testable in isolation
        'app/lib/hooks/useAuthAction.ts',
        // Type-only files
        'app/lib/types/**',
      ],
      thresholds: {
        lines: 70,
      },
    },
  },
});
