import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'cd server && npx tsx src/index.ts',
      port: 3001,
      timeout: 15_000,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '3001',
        NODE_ENV: 'test',
        // Plan B (2026-04-06): force the server to use mock tool
        // adapters so E2E runs do not burn real SerpApi / Google
        // Places quota. The real-API smoke suite in e2e/real-apis/
        // runs in a separate nightly workflow with this flag unset.
        E2E_MOCK_TOOLS: '1',
      },
    },
    {
      command: 'cd web-client && npx next dev --port 3000',
      port: 3000,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
