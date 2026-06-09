import { defineConfig } from 'vitest/config';

if (!process.env.TEST_API_URL) {
  throw new Error('TEST_API_URL is required for API live E2E tests');
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./tests/setup.ts'],
  },
});
