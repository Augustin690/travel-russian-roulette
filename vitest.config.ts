import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Default run: unit tests only. Use npm run test:* scripts for more.
    include: ['tests/unit/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 5000,
    reporters: ['verbose'],
    sequence: { concurrent: false },
  },
});
