import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// Playwright loads this config via CommonJS so __dirname is the
// directory of this file regardless of CWD. We use it to keep
// the testDir absolute, which lets the config work whether
// invoked from the monorepo root or from inside web-client
// (where the @playwright/test binary lives).
const ROOT_DIR = __dirname;

export default defineConfig({
  testDir: path.resolve(ROOT_DIR, 'e2e'),
  // The nightly real-API smoke suite lives at e2e/real-apis/ and
  // must NOT run in the main mocked suite. The e2e-real-apis.yml
  // workflow points at it explicitly with --grep or by passing the
  // path as an argument.
  testIgnore: ['**/real-apis/**'],
  timeout: 30_000,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
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
      // Run from the server package so dotenv finds server/.env
      // and tsx resolves src/index.ts. Without this Playwright
      // spawns from whatever CWD invoked it (web-client when
      // running via `pnpm --dir web-client exec`) and the
      // `cd server && ...` shell trick we previously used
      // crashed in CI because web-client/server does not exist.
      cwd: path.resolve(ROOT_DIR, 'server'),
      port: 3001,
      timeout: 15_000,
      reuseExistingServer: !process.env.CI,
      env: {
        // Forward the parent process env so DATABASE_URL,
        // REDIS_URL, and other server boot requirements survive.
        // Without this spread Playwright replaces process.env
        // wholesale and the server crashes with "DATABASE_URL is
        // required" before any test runs.
        ...(process.env as Record<string, string>),
        PORT: '3001',
        NODE_ENV: 'test',
        // Plan B: force the server to use mock tool adapters so
        // E2E runs do not burn real SerpApi / Google Places
        // quota. The real-API smoke suite in e2e/real-apis/ runs
        // in a separate nightly workflow with this flag unset.
        E2E_MOCK_TOOLS: '1',
        // Option B (2026-04-06): swap the real Anthropic SDK for
        // a deterministic stub so the suite needs no API key
        // and burns no tokens. The orchestrator falls back to
        // the real client when this is unset.
        E2E_MOCK_ANTHROPIC: '1',
      },
    },
    {
      command: 'npx next dev --port 3000',
      cwd: path.resolve(ROOT_DIR, 'web-client'),
      port: 3000,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
