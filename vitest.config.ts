import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
    hookTimeout: 5000,
    reporters: ['verbose'],
    sequence: { concurrent: false },
  },
});
