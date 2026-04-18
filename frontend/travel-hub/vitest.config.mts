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
      include: ['app/**/*.ts', 'app/**/*.tsx', 'app/**/*.js', 'app/**/*.jsx'],
      exclude: [
        // Layouts — pure wrappers with no testable logic
        'app/layout.tsx',
        'app/**/layout.tsx',
        // Theme / config — no logic
        'app/theme.ts',
        // Stub pages — placeholder content only, nothing to test
        'app/(auth)/login/manager/page.tsx',
        'app/(auth)/register/manager/page.tsx',
        'app/manager/page.tsx',
        'app/manager/hotel/**',
        'app/traveler/page.tsx',
        'app/traveler/booking/page.tsx',
        'app/traveler/hotel/**',
        // Type-only files
        'app/lib/types/**',
      ],
      thresholds: {
        lines: 70,
      },
    },
  },
});
