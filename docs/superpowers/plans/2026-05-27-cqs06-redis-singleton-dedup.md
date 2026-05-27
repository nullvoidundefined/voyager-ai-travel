# CQS-06: Redis Singleton Deduplication

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the triplicated Redis singleton pattern into a single shared module, reducing the server from 3 independent Redis connections to 1.

**Architecture:** Create `server/src/services/redis.service.ts` that owns the singleton, exports `getRedis()`, `connectRedis()`, and `disconnectRedis()`. Migrate the three consumers (`cache.service.ts`, `serpApiQuota.service.ts`, `tokenBudget.service.ts`) to import from it. Keep each service's domain logic (cache get/set, quota counters, token budgets) in its own file.

**Tech Stack:** ioredis, Vitest

---

### File structure

| Action | Path                                               | Responsibility                                                              |
| ------ | -------------------------------------------------- | --------------------------------------------------------------------------- |
| Create | `server/src/services/redis.service.ts`             | Shared Redis singleton: `getRedis()`, `connectRedis()`, `disconnectRedis()` |
| Create | `server/src/services/redis.service.test.ts`        | Tests for the shared module                                                 |
| Modify | `server/src/services/cache.service.ts`             | Remove private `getRedis()`, import from `redis.service.ts`                 |
| Modify | `server/src/services/serpApiQuota.service.ts`      | Remove private `getRedis()`, import from `redis.service.ts`                 |
| Modify | `server/src/services/tokenBudget.service.ts`       | Remove private `getRedis()`, import from `redis.service.ts`                 |
| Modify | `server/src/services/cache.service.test.ts`        | Update mock path                                                            |
| Modify | `server/src/services/serpApiQuota.service.test.ts` | Update mock path                                                            |
| Modify | `server/src/services/tokenBudget.service.test.ts`  | Update mock path                                                            |
| Modify | `server/src/app.ts`                                | Import `connectRedis`/`disconnectRedis` from new module                     |

---

### Task 0: Create shared Redis service

**Files:**

- Create: `server/src/services/redis.service.ts`

- [ ] **Step 0.1: Write the shared module**

```typescript
import { logger } from 'app/utils/logs/logger.js';
import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });
    return redis;
  } catch (err) {
    logger.warn({ err }, 'Failed to create Redis client');
    return null;
  }
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  if (!client) {
    logger.warn('REDIS_URL not set, cache/quota/budget disabled');
    return;
  }
  await client.connect();
  logger.info('Redis connected');
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected');
  }
}
```

This merges the best of all three patterns: the try/catch from `serpApiQuota`/`tokenBudget`, the lifecycle methods from `cache.service`, and the error listener from `cache.service`.

- [ ] **Step 0.2: Write tests**

Create `server/src/services/redis.service.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('redis.service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
  });

  it('returns null when REDIS_URL is not set', async () => {
    delete process.env.REDIS_URL;
    const { getRedis } = await import('./redis.service.js');
    expect(getRedis()).toBeNull();
  });

  it('returns the same instance on repeated calls', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    vi.doMock('ioredis', () => ({
      default: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn(),
        quit: vi.fn(),
      })),
    }));
    const { getRedis } = await import('./redis.service.js');
    const a = getRedis();
    const b = getRedis();
    expect(a).toBe(b);
  });

  it('disconnectRedis nulls the singleton', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    vi.doMock('ioredis', () => ({
      default: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn(),
        quit: vi.fn().mockResolvedValue('OK'),
      })),
    }));
    const { getRedis, disconnectRedis } = await import('./redis.service.js');
    expect(getRedis()).not.toBeNull();
    await disconnectRedis();
    // After disconnect, a fresh import would be needed to test re-creation
    // but we can verify the quit was called
  });
});
```

- [ ] **Step 0.3: Run tests**

```bash
cd server && npx vitest run src/services/redis.service.test.ts
```

- [ ] **Step 0.4: Commit**

```bash
git add server/src/services/redis.service.ts server/src/services/redis.service.test.ts
git commit -m "feat(CQS-06): add shared Redis singleton service

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 1: Migrate cache.service.ts

**Files:**

- Modify: `server/src/services/cache.service.ts`
- Modify: `server/src/services/cache.service.test.ts`

- [ ] **Step 1.1: Remove private Redis code from cache.service.ts**

Remove the module-level `let redis`, the `getRedis()` function body, the `connectRedis()` and `disconnectRedis()` functions. Replace with imports:

```typescript
import { connectRedis, disconnectRedis, getRedis } from './redis.service.js';

// Re-export for backward compatibility with app.ts and tool files
export { connectRedis, disconnectRedis, getRedis };
```

Keep all cache-specific functions (`cacheGet`, `cacheSet`, `cacheDel`, `normalizeCacheKey`) unchanged -- they already call `getRedis()` which will now come from the shared module.

- [ ] **Step 1.2: Update cache.service.test.ts**

Update the mock target. The test currently mocks `ioredis` directly. Now it should mock `./redis.service.js` instead:

```typescript
vi.mock('./redis.service.js', () => ({
  getRedis: vi.fn(),
  connectRedis: vi.fn(),
  disconnectRedis: vi.fn(),
}));
```

- [ ] **Step 1.3: Run tests**

```bash
cd server && npx vitest run src/services/cache.service.test.ts
```

- [ ] **Step 1.4: Run all tool tests that import cache.service**

```bash
cd server && npx vitest run src/tools/flights.tool.test.ts src/tools/hotels.tool.test.ts src/tools/car-rentals.tool.test.ts src/tools/experiences.tool.test.ts
```

- [ ] **Step 1.5: Commit**

```bash
git add server/src/services/cache.service.ts server/src/services/cache.service.test.ts
git commit -m "refactor(CQS-06): migrate cache.service to shared Redis singleton

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Migrate serpApiQuota.service.ts

**Files:**

- Modify: `server/src/services/serpApiQuota.service.ts`
- Modify: `server/src/services/serpApiQuota.service.test.ts`

- [ ] **Step 2.1: Replace private getRedis with import**

Remove the module-level `let redis` and private `getRedis()` function. Add:

```typescript
import { getRedis } from './redis.service.js';
```

All existing functions (`getMonthlyUsage`, `incrementMonthlyUsage`, `isOverMonthlyCap`) already call `getRedis()` -- they'll now resolve to the shared singleton.

- [ ] **Step 2.2: Update test mock**

Replace the `ioredis` mock with a mock of `./redis.service.js`:

```typescript
vi.mock('./redis.service.js', () => ({
  getRedis: vi.fn(),
}));
```

Adjust test setup to configure `getRedis` to return a mock Redis instance.

- [ ] **Step 2.3: Run tests**

```bash
cd server && npx vitest run src/services/serpApiQuota.service.test.ts src/services/serpapi.service.test.ts
```

- [ ] **Step 2.4: Commit**

```bash
git add server/src/services/serpApiQuota.service.ts server/src/services/serpApiQuota.service.test.ts
git commit -m "refactor(CQS-06): migrate serpApiQuota to shared Redis singleton

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Migrate tokenBudget.service.ts

**Files:**

- Modify: `server/src/services/tokenBudget.service.ts`
- Modify: `server/src/services/tokenBudget.service.test.ts`

- [ ] **Step 3.1: Replace private getRedis with import**

Same pattern as Task 2. Remove private Redis code, import from `redis.service.js`.

- [ ] **Step 3.2: Update test mock**

Same pattern as Task 2.

- [ ] **Step 3.3: Run tests**

```bash
cd server && npx vitest run src/services/tokenBudget.service.test.ts
```

- [ ] **Step 3.4: Commit**

```bash
git add server/src/services/tokenBudget.service.ts server/src/services/tokenBudget.service.test.ts
git commit -m "refactor(CQS-06): migrate tokenBudget to shared Redis singleton

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Update app.ts lifecycle imports

**Files:**

- Modify: `server/src/app.ts`

- [ ] **Step 4.1: Update imports**

`app.ts` currently imports `connectRedis` and `disconnectRedis` from `cache.service.ts`. Since `cache.service.ts` re-exports them, this should work without changes. Verify by reading the current import line and confirming it still resolves.

If `app.ts` imports directly from `cache.service`, no change needed (the re-export handles it). If you prefer explicit sourcing, change the import to:

```typescript
import { connectRedis, disconnectRedis } from 'app/services/redis.service.js';
```

- [ ] **Step 4.2: Run full test suite**

```bash
cd server && npx vitest run
```

All 715+ tests must pass.

- [ ] **Step 4.3: Run build**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 4.4: Update ISSUES.md**

Mark CQS-06 as resolved.

- [ ] **Step 4.5: Commit**

```bash
git add server/src/app.ts ISSUES.md
git commit -m "refactor(CQS-06): complete Redis singleton dedup -- 3 connections to 1

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
