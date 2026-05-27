# Engineering/CI Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 10 engineering and CI findings: add web-client tests to CI, fix CORS test, migrate rateLimiter Redis, fix tsconfig target, clean dist before build, Dockerfile USER node, move DB health check, schedule session cleanup, wire smoke test.

**Architecture:** Infrastructure and build-tooling fixes. No application logic changes. Each task is independent.

**Tech Stack:** GitHub Actions, Vitest, Docker, Express 5, TypeScript, ioredis

---

## Task 1: Add web-client tests and build to CI [trivial]

The CI workflow only runs server tests. The web-client has Vitest tests that never run in CI.

**Files:** `.github/workflows/ci.yml`

### Steps

- [ ] Add web-client build step after the existing server build (line 65). Insert a new step:

```yaml
- name: Build web-client
  run: pnpm --filter voyager-web build
```

- [ ] Add web-client unit test step after the server unit test step (after line 81). Insert:

```yaml
- name: Web-client unit tests
  run: pnpm --filter voyager-web run test
```

- [ ] Run `pnpm --filter voyager-web run test` locally to confirm the tests pass before committing.

---

## Task 2: Fix CORS integration test [trivial]

The CORS integration test hardcodes `http://localhost:5173` as the expected origin. The `corsConfig.ts` reads `process.env.CORS_ORIGIN` at import time, defaulting to `http://localhost:5173`. In CI (and local runs with `.env`), `CORS_ORIGIN` may be set to `http://localhost:3000`, causing the test to fail. The test must control the env var before the app module is imported.

**Files:** `server/src/__integration__/cors.integration.test.ts`

### Steps

- [ ] Replace the entire test file with a version that sets `CORS_ORIGIN` before importing the app, and uses `vi.resetModules()` to ensure the corsConfig re-reads the env:

```ts
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const TEST_ORIGIN = 'http://localhost:5173';

describe('CORS Integration', () => {
  let server: Server;
  let app: (typeof import('app/app.js'))['app'];

  beforeAll(async () => {
    vi.resetModules();
    process.env.CORS_ORIGIN = TEST_ORIGIN;
    const mod = await import('app/app.js');
    app = mod.app;
    server = app.listen(0);
  });

  afterAll(() => {
    server?.close();
  });

  it('includes Access-Control-Allow-Origin for allowed origin', async () => {
    const res = await request(server).get('/health').set('Origin', TEST_ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(TEST_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not include CORS headers for disallowed origin', async () => {
    const res = await request(server)
      .get('/health')
      .set('Origin', 'http://evil.com');

    const corsHeader = res.headers['access-control-allow-origin'];
    expect(corsHeader).not.toBe('http://evil.com');
  });

  it('handles preflight OPTIONS request', async () => {
    const res = await request(server)
      .options('/auth/login')
      .set('Origin', TEST_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, X-Requested-With');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(TEST_ORIGIN);
    expect(res.headers['access-control-allow-headers']).toMatch(
      /X-Requested-With/i,
    );
  });
});
```

- [ ] Run `pnpm --filter voyager-server run test:integration` to confirm the test passes.

---

## Task 3: Migrate rateLimiter to shared Redis singleton [standard]

The rateLimiter creates its own private Redis client (`getRedisClient()` on lines 27-61 of `rateLimiter.ts`). A shared singleton already exists at `app/services/redis.service.js`. The private client should be replaced with the shared one.

**Compatibility note:** The shared singleton uses `lazyConnect: true` and the default `enableOfflineQueue: true`. The rate-limit-redis `RedisStore` constructor synchronously calls `sendCommand()` before the TCP connection is ready. With `enableOfflineQueue: true` (the ioredis default), these commands buffer in the offline queue and flush once connected. This matches the rateLimiter's existing requirement documented in the boot test. No behavioral change.

**Files:**

- `server/src/middleware/rateLimiter/rateLimiter.ts`
- `server/src/middleware/rateLimiter/rateLimiter.boot.test.ts`

### Steps

- [ ] In `rateLimiter.ts`, remove the private `redisClient` variable and `getRedisClient()` function (lines 27-61). Replace with an import of the shared singleton:

```ts
import { getRedis } from 'app/services/redis.service.js';
```

Remove the `import { Redis } from 'ioredis';` line since it is no longer needed.

- [ ] Update the `makeStore()` function to use `getRedis()` instead of `getRedisClient()`:

```ts
function makeStore(prefix: string): Store | undefined {
  const client = getRedis();
  if (!client) {
    if (isProduction()) {
      logger.warn(
        { prefix },
        'Rate limiter falling back to in-memory store in production (REDIS_URL not set)',
      );
    }
    return undefined;
  }
  return new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (...args: string[]) => (client as any).call(...args),
    prefix: `voyager-rl:${prefix}:`,
  }) as unknown as Store;
}
```

- [ ] The boot test (`rateLimiter.boot.test.ts`) sets `REDIS_URL` to a non-listening port and imports the rateLimiter module. After the migration, the shared `getRedis()` will be invoked instead of the private one. The test should still pass because the shared service also handles non-reachable URLs gracefully. Run:

```bash
pnpm --filter voyager-server run test -- rateLimiter
```

Verify all three test files pass: `rateLimiter.test.ts`, `rateLimiter.boot.test.ts`, `rateLimiter.ipv6.test.ts`.

- [ ] If the boot test fails because `vi.resetModules()` does not clear the shared singleton, update the boot test to also reset the redis.service module state. The `getRedis()` singleton caches after first call, so `vi.resetModules()` must be called before import to get a fresh singleton. The existing `beforeEach` already calls `vi.resetModules()`, so this should work. Confirm.

---

## Task 4: Build tooling fixes [trivial]

Three independent single-line changes.

### 4a: Fix tsconfig target

**File:** `web-client/tsconfig.json`

- [ ] Change `"target": "ES2017"` to `"target": "ES2022"` (Next.js 15 targets modern browsers; ES2022 enables top-level await, class fields, and other features the codebase already uses):

```json
"target": "ES2022",
```

Note: ES2018 was the minimum suggested by the audit, but ES2022 aligns with Next.js 15 defaults and the `engines` field requiring Node >= 20.

### 4b: Clean dist before build

**File:** `server/package.json`

- [ ] Update the `build` script to clean `dist/` first:

```json
"build": "rm -rf dist && tsc && tsc-alias -p tsconfig.json && mkdir -p dist/data && cp src/data/*.json dist/data/",
```

### 4c: Dockerfile USER node

**File:** `Dockerfile.server`

- [ ] Add `USER node` between the `EXPOSE` and `CMD` lines. The `node:22-slim` base image already includes a `node` user. Final block becomes:

```dockerfile
EXPOSE 3001
USER node
CMD ["node", "server/dist/index.js"]
```

- [ ] Verify the Docker build still succeeds:

```bash
docker build -f Dockerfile.server -t voyager-server-test .
```

---

## Task 5: Move DB health check and schedule session cleanup [standard]

The `query('SELECT NOW()')` call at module scope (line 79 of `app.ts`) fires on import, which makes test isolation harder. Move it inside `startServer()`. Also add a periodic `deleteExpiredSessions()` call.

**Files:**

- `server/src/app.ts`

### Steps

- [ ] Remove the module-scope `SELECT NOW()` call (lines 79-81):

```ts
// REMOVE these three lines:
query('SELECT NOW()')
  .then(() => logger.info('Connected to database'))
  .catch((err: unknown) => logger.error({ err }, 'Database connection failed'));
```

- [ ] Inside `startServer()`, after the `pool.on('error', ...)` block (after line 152) and before the process event handlers, add the health check and session cleanup:

```ts
// DB connectivity check (moved from module scope for test isolation)
query('SELECT NOW()')
  .then(() => logger.info('Connected to database'))
  .catch((err: unknown) => logger.error({ err }, 'Database connection failed'));

// Purge expired sessions every hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
setInterval(() => {
  deleteExpiredSessions()
    .then((count) => {
      if (count > 0) {
        logger.info({ count }, 'Cleaned up expired sessions');
      }
    })
    .catch((err: unknown) => {
      logger.error({ err }, 'Failed to clean up expired sessions');
    });
}, CLEANUP_INTERVAL_MS);
```

- [ ] Add the import at the top of `app.ts`:

```ts
import { deleteExpiredSessions } from 'app/repositories/auth/auth.js';
```

- [ ] Run `pnpm --filter voyager-server run test` to confirm nothing broke.

---

## Task 6: Add pnpm audit to CI [trivial]

The CI workflow already has a `pnpm audit` step (lines 50-56). Verify it covers both server and web-client.

**Files:** `.github/workflows/ci.yml`

### Steps

- [ ] Read lines 50-56 of `.github/workflows/ci.yml`. The existing step runs `pnpm audit --prod --audit-level high` at the workspace root, which covers all workspace packages. No change needed if it already runs at the root level.

- [ ] If the step only filters to one package, update it to run at the workspace root:

```yaml
- name: pnpm audit (production dependencies, high and above)
  run: pnpm audit --prod --audit-level high
```

- [ ] Confirm this step is already present and covers both packages. If so, mark this task as complete with no code changes.

---

## Verification

After all tasks are complete, run the full verification chain:

```bash
pnpm format:check && pnpm lint && pnpm --filter voyager-server run test && pnpm --filter voyager-web run test && pnpm --filter voyager-server run build && pnpm --filter voyager-web run build
```

If the Docker build was changed, also run:

```bash
docker build -f Dockerfile.server -t voyager-server-verify .
```
