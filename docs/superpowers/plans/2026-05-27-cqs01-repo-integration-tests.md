# CQS-01: Repository Integration Tests

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5 repository test files that mock the database pool with integration tests that run against a real Postgres database, eliminating R-200 anti-pattern #5.

**Architecture:** Use the existing integration test infrastructure (`vitest.integration.config.ts`, `__integration__/setup.ts`) as the foundation. Create a shared test helper that provides per-test transaction isolation (begin transaction in beforeEach, rollback in afterEach) so tests are fast and don't leave residue. Migrate one repo at a time, starting with the simplest (agent-turn-cost, which has no pool mock) and ending with the most complex (trips).

**Tech Stack:** Vitest, pg (via existing pool), Postgres (Neon), existing `vitest.integration.config.ts`

---

### File structure

| Action | Path                                                                          | Responsibility                                                                                |
| ------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Create | `server/src/__integration__/helpers/testTransaction.ts`                       | Per-test transaction isolation helper                                                         |
| Create | `server/src/__integration__/helpers/seed.ts`                                  | Shared seed data factory functions                                                            |
| Create | `server/src/__integration__/repositories/auth.integration.test.ts`            | Auth repo integration tests                                                                   |
| Create | `server/src/__integration__/repositories/conversations.integration.test.ts`   | Conversations repo integration tests                                                          |
| Create | `server/src/__integration__/repositories/tool-call-log.integration.test.ts`   | Tool call log repo integration tests                                                          |
| Create | `server/src/__integration__/repositories/trips.integration.test.ts`           | Trips repo integration tests                                                                  |
| Create | `server/src/__integration__/repositories/userPreferences.integration.test.ts` | User preferences repo integration tests                                                       |
| Modify | `server/src/__integration__/setup.ts`                                         | Add cleanup for new tables (tool_call_log, conversations, user_preferences, agent_turn_costs) |

The existing unit test files (`server/src/repositories/*/\*.test.ts`) are NOT deleted. They stay as fast smoke tests for SQL shape. The integration tests supplement them with behavioral verification against a real database.

---

### Task 0: Extend integration setup with full table cleanup

**Files:**

- Modify: `server/src/__integration__/setup.ts`

- [ ] **Step 0.1: Read the current setup file**

Read `server/src/__integration__/setup.ts` to see existing cleanup tables.

- [ ] **Step 0.2: Add missing tables to cleanup**

The current setup deletes from `trip_hotels`, `trip_flights`, `trips`, `sessions`, `users`. Add the missing tables that repo tests will touch. The deletion order must respect FK constraints:

```typescript
// In the cleanup function, before existing deletes:
await pool.query(
  `DELETE FROM agent_turn_costs WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))`,
  [sentinel],
);
await pool.query(
  `DELETE FROM tool_call_log WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))`,
  [sentinel],
);
await pool.query(
  `DELETE FROM user_preferences WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`,
  [sentinel],
);
await pool.query(
  `DELETE FROM conversations WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`,
  [sentinel],
);
await pool.query(
  `DELETE FROM trip_car_rentals WHERE trip_id IN (SELECT id FROM trips WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))`,
  [sentinel],
);
await pool.query(
  `DELETE FROM trip_experiences WHERE trip_id IN (SELECT id FROM trips WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))`,
  [sentinel],
);
```

Place these BEFORE the existing `trip_hotels`, `trip_flights` deletes.

- [ ] **Step 0.3: Run existing integration tests to verify no regression**

```bash
cd server && npx vitest run --config vitest.integration.config.ts
```

- [ ] **Step 0.4: Commit**

```bash
git add server/src/__integration__/setup.ts
git commit -m "test: extend integration setup with full table cleanup

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 1: Create transaction isolation helper

**Files:**

- Create: `server/src/__integration__/helpers/testTransaction.ts`

- [ ] **Step 1.1: Write the helper**

```typescript
import { pool } from 'app/db/pool/pool.js';
import type { PoolClient } from 'pg';
import { afterEach, beforeEach } from 'vitest';

let client: PoolClient | null = null;

export function useTestTransaction() {
  beforeEach(async () => {
    client = await pool.connect();
    await client.query('BEGIN');
  });

  afterEach(async () => {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
  });

  return {
    getClient: () => {
      if (!client) throw new Error('No test transaction active');
      return client;
    },
  };
}
```

Note: this helper provides a client-scoped transaction. Repo functions that use the module-level `query()` will NOT use this client. For repos that accept an optional `client` parameter, pass it. For repos that don't, the tests will use the module-level pool directly (the setup.ts sentinel cleanup handles residue). This is a pragmatic compromise -- adding client injection to every repo function is a separate refactor.

- [ ] **Step 1.2: Commit**

```bash
git add server/src/__integration__/helpers/testTransaction.ts
git commit -m "test: add per-test transaction isolation helper

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Create seed data factory

**Files:**

- Create: `server/src/__integration__/helpers/seed.ts`

- [ ] **Step 2.1: Write seed helpers**

```typescript
import { pool } from 'app/db/pool/pool.js';
import { randomUUID } from 'node:crypto';

const SENTINEL_DOMAIN = '@integration-test.invalid';

export async function seedUser(
  overrides: { email?: string; first_name?: string; last_name?: string } = {},
) {
  const id = randomUUID();
  const email = overrides.email ?? `${id}${SENTINEL_DOMAIN}`;
  const result = await pool.query(
    `INSERT INTO users (id, email, first_name, last_name, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
    [
      id,
      email,
      overrides.first_name ?? 'Test',
      overrides.last_name ?? 'User',
      'hash-not-used-in-repo-tests',
    ],
  );
  return result.rows[0];
}

export async function seedTrip(
  userId: string,
  overrides: Record<string, unknown> = {},
) {
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO trips (id, user_id, destination, origin, departure_date, return_date, budget_total, travelers, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
    [
      id,
      userId,
      overrides.destination ?? 'Paris',
      overrides.origin ?? 'New York',
      overrides.departure_date ?? '2026-08-01',
      overrides.return_date ?? '2026-08-10',
      overrides.budget_total ?? 5000,
      overrides.travelers ?? 2,
      overrides.status ?? 'planning',
    ],
  );
  return result.rows[0];
}

export async function seedConversation(userId: string, tripId: string) {
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO conversations (id, user_id, trip_id) VALUES ($1, $2, $3) RETURNING *`,
    [id, userId, tripId],
  );
  return result.rows[0];
}

export async function seedSession(userId: string) {
  const token = randomUUID();
  const result = await pool.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')
         RETURNING *`,
    [randomUUID(), userId, token],
  );
  return { ...result.rows[0], rawToken: token };
}
```

Adjust column names to match the actual schema. Read the migration files or existing integration tests to verify exact column names before writing.

- [ ] **Step 2.2: Commit**

```bash
git add server/src/__integration__/helpers/seed.ts
git commit -m "test: add seed data factory for integration tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Auth repository integration tests

**Files:**

- Create: `server/src/__integration__/repositories/auth.integration.test.ts`

- [ ] **Step 3.1: Write integration tests**

Cover all exported functions from `repositories/auth/auth.ts`:

- `createUser` -- creates a user, verify it exists in DB
- `findUserByEmail` -- seed user, find by email, verify fields match
- `createUserAndSession` -- verify both user and session rows created in a transaction
- `loginUser` -- seed user + session, verify session created
- `deleteExpiredSessions` -- seed expired sessions, verify they're deleted
- `getSessionWithUser` -- seed user + session, verify join returns user fields

Each test should:

1. Seed the required data using `seed.ts` helpers
2. Call the repo function under test
3. Assert on the actual database state (query the DB to verify)

- [ ] **Step 3.2: Run the test**

```bash
cd server && npx vitest run --config vitest.integration.config.ts src/__integration__/repositories/auth.integration.test.ts
```

- [ ] **Step 3.3: Commit**

```bash
git add server/src/__integration__/repositories/auth.integration.test.ts
git commit -m "test(CQS-01): add auth repo integration tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Conversations repository integration tests

**Files:**

- Create: `server/src/__integration__/repositories/conversations.integration.test.ts`

- [ ] **Step 4.1: Write integration tests**

Cover:

- `getOrCreateConversation` -- first call creates, second call returns existing
- `saveMessage` -- save a message, query DB to verify
- `getMessagesByConversation` -- save multiple messages, verify order
- `updateBookingState` -- update state, verify JSONB merge in DB

- [ ] **Step 4.2: Run and commit**

```bash
cd server && npx vitest run --config vitest.integration.config.ts src/__integration__/repositories/conversations.integration.test.ts
git add server/src/__integration__/repositories/conversations.integration.test.ts
git commit -m "test(CQS-01): add conversations repo integration tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Tool call log repository integration tests

**Files:**

- Create: `server/src/__integration__/repositories/tool-call-log.integration.test.ts`

- [ ] **Step 5.1: Write integration tests**

Cover:

- `insertToolCallLog` -- insert a log entry, verify it exists with correct fields
- `getToolCallsByConversation` -- insert multiple, verify filtered by conversation

- [ ] **Step 5.2: Run and commit**

```bash
cd server && npx vitest run --config vitest.integration.config.ts src/__integration__/repositories/tool-call-log.integration.test.ts
git add server/src/__integration__/repositories/tool-call-log.integration.test.ts
git commit -m "test(CQS-01): add tool-call-log repo integration tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: User preferences repository integration tests

**Files:**

- Create: `server/src/__integration__/repositories/userPreferences.integration.test.ts`

- [ ] **Step 6.1: Write integration tests**

Cover:

- `findByUserId` -- returns null for non-existent user
- `upsert` -- first call inserts, second call merges (verify JSONB merge is atomic)
- Concurrent upsert test: fire two `upsert` calls in `Promise.all` for the same user with different keys, verify both keys present in final state (this is the race condition the P1 fix addressed)

- [ ] **Step 6.2: Run and commit**

```bash
cd server && npx vitest run --config vitest.integration.config.ts src/__integration__/repositories/userPreferences.integration.test.ts
git add server/src/__integration__/repositories/userPreferences.integration.test.ts
git commit -m "test(CQS-01): add userPreferences repo integration tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Trips repository integration tests

**Files:**

- Create: `server/src/__integration__/repositories/trips.integration.test.ts`

- [ ] **Step 7.1: Write integration tests**

Cover all exported functions:

- `createTrip` -- create trip, verify in DB
- `listTrips` -- seed multiple trips for one user, verify pagination
- `getTripWithDetails` -- seed trip + flight + hotel selections, verify joined result
- `updateTrip` -- update fields, verify in DB; also verify the allowlist rejects unknown keys
- `deleteTrip` -- delete, verify gone
- `clearSelectionsForTrip` -- seed selections, clear, verify all gone
- `insertTripFlight`, `insertTripHotel`, `insertTripCarRental`, `insertTripExperience` -- insert each type, verify in DB

- [ ] **Step 7.2: Run and commit**

```bash
cd server && npx vitest run --config vitest.integration.config.ts src/__integration__/repositories/trips.integration.test.ts
git add server/src/__integration__/repositories/trips.integration.test.ts
git commit -m "test(CQS-01): add trips repo integration tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Run full integration suite and verify

- [ ] **Step 8.1: Run all integration tests together**

```bash
cd server && npx vitest run --config vitest.integration.config.ts
```

All tests must pass.

- [ ] **Step 8.2: Run unit tests to verify no regression**

```bash
cd server && npx vitest run
```

Unit tests must still pass (they're independent).

- [ ] **Step 8.3: Update ISSUES.md**

Mark CQS-01 as resolved:

```markdown
### [CQS-01] All 5 repository test files mock the database pool (R-200 anti-pattern #5)

...

- **Status:** RESOLVED in commit <sha>. Integration tests added for all 5 repositories.
```

- [ ] **Step 8.4: Commit**

```bash
git add ISSUES.md
git commit -m "docs: mark CQS-01 resolved -- repo integration tests complete

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
