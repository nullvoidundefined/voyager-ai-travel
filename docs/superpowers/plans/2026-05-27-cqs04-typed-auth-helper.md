# CQS-04: Typed Auth Helper

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 11 `req.user!.id` non-null assertions across 3 handler files with a type-safe `getAuthUser(req)` helper that throws `ApiError.unauthorized()` if the user is missing.

**Architecture:** Create a single helper function in `server/src/middleware/requireAuth/` (co-located with the middleware it complements). The helper narrows `req.user` from `User | undefined` to `User`, making the type system enforce the auth contract instead of relying on `!` assertions. Each handler file gets a mechanical replacement: `req.user!.id` becomes `getAuthUser(req).id`.

**Tech Stack:** TypeScript, Express, Vitest

---

### File structure

| Action | Path                                                     | Responsibility                      |
| ------ | -------------------------------------------------------- | ----------------------------------- |
| Create | `server/src/middleware/requireAuth/getAuthUser.ts`       | Type-narrowing helper               |
| Create | `server/src/middleware/requireAuth/getAuthUser.test.ts`  | Unit tests                          |
| Modify | `server/src/handlers/chat/chat.ts`                       | Replace `req.user!` (2 occurrences) |
| Modify | `server/src/handlers/trips/trips.ts`                     | Replace `req.user!` (7 occurrences) |
| Modify | `server/src/handlers/userPreferences/userPreferences.ts` | Replace `req.user!` (2 occurrences) |

---

### Task 0: Create the helper with tests

**Files:**

- Create: `server/src/middleware/requireAuth/getAuthUser.ts`
- Create: `server/src/middleware/requireAuth/getAuthUser.test.ts`

- [ ] **Step 0.1: Write the failing test**

```typescript
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { getAuthUser } from './getAuthUser.js';

describe('getAuthUser', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    created_at: new Date(),
    updated_at: null,
  };

  it('returns the user when req.user is defined', () => {
    const req = { user: mockUser } as Request;
    const result = getAuthUser(req);
    expect(result).toBe(mockUser);
    expect(result.id).toBe('123');
  });

  it('throws ApiError.unauthorized when req.user is undefined', () => {
    const req = {} as Request;
    expect(() => getAuthUser(req)).toThrow();
    try {
      getAuthUser(req);
    } catch (err: unknown) {
      expect((err as { statusCode: number }).statusCode).toBe(401);
    }
  });

  it('return type is User, not User | undefined', () => {
    const req = { user: mockUser } as Request;
    const user = getAuthUser(req);
    // This line would fail to compile if getAuthUser returned User | undefined
    // because .id would need a null check
    const id: string = user.id;
    expect(id).toBe('123');
  });
});
```

- [ ] **Step 0.2: Run the test, confirm it fails**

```bash
cd server && npx vitest run src/middleware/requireAuth/getAuthUser.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 0.3: Write the implementation**

```typescript
import type { User } from 'app/schemas/auth.js';
import { ApiError } from 'app/utils/ApiError.js';
import type { Request } from 'express';

export function getAuthUser(req: Request): User {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  return req.user;
}
```

- [ ] **Step 0.4: Run the test, confirm it passes**

```bash
cd server && npx vitest run src/middleware/requireAuth/getAuthUser.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 0.5: Commit**

```bash
git add server/src/middleware/requireAuth/getAuthUser.ts server/src/middleware/requireAuth/getAuthUser.test.ts
git commit -m "feat(CQS-04): add type-safe getAuthUser helper

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 1: Migrate chat handlers

**Files:**

- Modify: `server/src/handlers/chat/chat.ts`

- [ ] **Step 1.1: Add import**

```typescript
import { getAuthUser } from 'app/middleware/requireAuth/getAuthUser.js';
```

- [ ] **Step 1.2: Replace occurrences**

Line 47: `const userId = req.user!.id;` becomes `const userId = getAuthUser(req).id;`
Line 239: `const userId = req.user!.id;` becomes `const userId = getAuthUser(req).id;`

- [ ] **Step 1.3: Run chat handler tests**

```bash
cd server && npx vitest run src/handlers/chat/chat.test.ts
```

- [ ] **Step 1.4: Commit**

```bash
git add server/src/handlers/chat/chat.ts
git commit -m "refactor(CQS-04): use getAuthUser in chat handlers

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Migrate trips handlers

**Files:**

- Modify: `server/src/handlers/trips/trips.ts`

- [ ] **Step 2.1: Add import**

```typescript
import { getAuthUser } from 'app/middleware/requireAuth/getAuthUser.js';
```

- [ ] **Step 2.2: Replace all 7 occurrences**

Lines 32, 42, 48, 60, 149, 171, 268: each `req.user!.id` becomes `getAuthUser(req).id`.

- [ ] **Step 2.3: Run trips handler tests**

```bash
cd server && npx vitest run src/handlers/trips/trips.test.ts
```

- [ ] **Step 2.4: Commit**

```bash
git add server/src/handlers/trips/trips.ts
git commit -m "refactor(CQS-04): use getAuthUser in trips handlers

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Migrate userPreferences handlers

**Files:**

- Modify: `server/src/handlers/userPreferences/userPreferences.ts`

- [ ] **Step 3.1: Add import and replace**

```typescript
import { getAuthUser } from 'app/middleware/requireAuth/getAuthUser.js';
```

Lines 8, 14: each `req.user!.id` becomes `getAuthUser(req).id`.

- [ ] **Step 3.2: Run tests**

```bash
cd server && npx vitest run src/handlers/userPreferences/userPreferences.test.ts
```

- [ ] **Step 3.3: Commit**

```bash
git add server/src/handlers/userPreferences/userPreferences.ts
git commit -m "refactor(CQS-04): use getAuthUser in userPreferences handlers

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Verify and close

- [ ] **Step 4.1: Verify no remaining `req.user!` in handlers**

```bash
grep -rn 'req\.user!' server/src/handlers/
```

Expected: no output.

- [ ] **Step 4.2: Run full test suite**

```bash
cd server && npx vitest run
```

All tests must pass.

- [ ] **Step 4.3: Run TypeScript check**

```bash
cd server && npx tsc --noEmit
```

Must be clean.

- [ ] **Step 4.4: Update ISSUES.md**

Mark CQS-04 as resolved.

- [ ] **Step 4.5: Commit**

```bash
git add ISSUES.md
git commit -m "docs: mark CQS-04 resolved -- typed auth helper replaces 11 non-null assertions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
