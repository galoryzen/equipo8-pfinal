import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['app/**/*.ts', 'app/**/*.tsx', 'app/**/*.js', 'app/**/*.jsx'],
      thresholds: {
        // Change this to 70 when we have more tests
        lines: 1,
      },
    },
  },
});
