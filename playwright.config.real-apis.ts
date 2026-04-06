/**
 * Real-API smoke configuration.
 *
 * Used ONLY by .github/workflows/e2e-real-apis.yml. Boots the
 * server WITHOUT E2E_MOCK_TOOLS so the agent loop hits live
 * SerpApi, Google Places, and Anthropic. Keep the suite small
 * (one or two tests max) to preserve monthly quotas.
 */
import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// Playwright loads this config via CommonJS, so __dirname is
// available natively and points to the directory of this file.
const ROOT_DIR = __dirname;

export default defineConfig({
  testDir: path.resolve(ROOT_DIR, 'e2e/real-apis'),
  timeout: 180_000,
  retries: 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npx tsx src/index.ts',
      cwd: path.resolve(ROOT_DIR, 'server'),
      port: 3001,
      timeout: 30_000,
      reuseExistingServer: false,
      env: {
        ...(process.env as Record<string, string>),
        PORT: '3001',
        NODE_ENV: 'test',
        // Note: no E2E_MOCK_TOOLS or E2E_MOCK_ANTHROPIC.
        // Real-API mode is the point.
      },
    },
    {
      command: 'npx next dev --port 3000',
      cwd: path.resolve(ROOT_DIR, 'web-client'),
      port: 3000,
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
