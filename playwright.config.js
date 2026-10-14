import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    // Use the Freebuff-managed preview (or an explicitly supplied URL). Never
    // start an unmanaged Vite server as a side effect of running browser tests.
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5180/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
});
