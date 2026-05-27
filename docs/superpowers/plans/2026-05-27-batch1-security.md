# Security Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 8 security findings from the 2026-05-27 audit: credential placeholder, dependency CVEs, schema hardening, message length cap, route gating, and input validation.

**Architecture:** Small, independent fixes to existing files. No new services or architectural changes. Each task is a self-contained commit.

**Tech Stack:** Express 5, TypeScript, Zod, Vitest

---

## Task 1: Verify .env.example placeholder [trivial]

**Files:** `server/.env.example`

**Context:** The real Neon credential was exposed in git history (commit `15bc653`). The working-tree copy already contains a placeholder. This task confirms it and documents the deferred history scrub.

### Steps

- [ ] Read `server/.env.example` line 5 and confirm it contains `postgresql://user:password@host:5432/dbname` (not a real `neon.tech` connection string).
- [ ] If it contains a real credential, replace line 5 with:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

- [ ] Commit:

```bash
pnpm exec prettier --config prettier.config.bottomlessmargaritas.mjs --write server/.env.example
git add server/.env.example
git commit -m "fix(SEC): verify .env.example contains placeholder credential

The real Neon connection string was in git history (commit 15bc653).
Working tree already has a placeholder. History scrub deferred to user action."
```

---

## Task 2: Bump Next.js and Anthropic SDK [trivial]

**Files:** `web-client/package.json`, `server/package.json`

### Steps

- [ ] In `web-client/package.json`, change line 28 from:

```json
"next": "15.5.14",
```

to:

```json
"next": "^15.5.18",
```

- [ ] In `server/package.json`, change line 25 from:

```json
"@anthropic-ai/sdk": "^0.81.0",
```

to:

```json
"@anthropic-ai/sdk": "^0.91.1",
```

- [ ] Run install and build from monorepo root:

```bash
pnpm install
pnpm build
```

- [ ] Commit:

```bash
git add web-client/package.json server/package.json pnpm-lock.yaml
git commit -m "fix(SEC): bump next to ^15.5.18 and @anthropic-ai/sdk to ^0.91.1

Addresses CVE advisories flagged in the 2026-05-27 security audit."
```

---

## Task 3: Harden tool input schemas (categories + select\_\* fields) [standard]

**Files:** `server/src/tools/schemas.ts`, `server/src/tools/schemas.test.ts`

**Context:** `searchExperiencesSchema.categories[]` items use bare `z.string().min(1).max(50)` with no content allowlist. Several `select_*` schemas have `z.string().min(1)` fields that accept shell metachars and XSS payloads. These need `locationAllowlist` applied.

Fields to harden:

- `searchExperiencesSchema`: `categories` array items (line 49)
- `selectFlightSchema`: `airline` (line 83), `flight_number` (line 84)
- `selectHotelSchema`: `name` (line 94)
- `selectCarRentalSchema`: `provider` (line 105), `car_name` (line 106)
- `selectExperienceSchema`: `name` (line 114)

Note: `flight_number` is alphanumeric with possible hyphens (e.g., "DL-100"), so `locationAllowlist` works. `airline`, `name`, `provider`, `car_name` are all location-like free text where `locationAllowlist` is appropriate.

### Steps

- [ ] **Write failing tests** in `server/src/tools/schemas.test.ts`. Add these test blocks after the existing `selectHotelSchema` tests:

```typescript
describe('searchExperiencesSchema categories[] allowlist', () => {
  const baseValid = {
    location: 'Paris',
    categories: ['food'],
  };

  for (const bad of BAD_INPUTS) {
    it(`rejects categories=[${JSON.stringify(bad).slice(0, 40)}]`, () => {
      const result = searchExperiencesSchema.safeParse({
        ...baseValid,
        categories: [bad],
      });
      expect(result.success).toBe(false);
    });
  }

  for (const good of GOOD_INPUTS) {
    it(`accepts categories=[${good}]`, () => {
      const result = searchExperiencesSchema.safeParse({
        ...baseValid,
        categories: [good],
      });
      expect(result.success).toBe(true);
    });
  }
});

describe('selectFlightSchema airline/flight_number allowlist', () => {
  const baseValid = {
    origin: 'JFK',
    destination: 'Paris',
    price: 450,
    currency: 'USD',
  };

  for (const bad of BAD_INPUTS) {
    it(`rejects airline=${JSON.stringify(bad).slice(0, 40)}`, () => {
      const result = selectFlightSchema.safeParse({
        ...baseValid,
        airline: bad,
        flight_number: 'DL100',
      });
      expect(result.success).toBe(false);
    });

    it(`rejects flight_number=${JSON.stringify(bad).slice(0, 40)}`, () => {
      const result = selectFlightSchema.safeParse({
        ...baseValid,
        airline: 'Delta',
        flight_number: bad,
      });
      expect(result.success).toBe(false);
    });
  }
});

describe('selectHotelSchema name allowlist', () => {
  const baseValid = {
    price_per_night: 200,
    total_price: 1000,
    currency: 'USD',
  };

  for (const bad of BAD_INPUTS) {
    it(`rejects name=${JSON.stringify(bad).slice(0, 40)}`, () => {
      const result = selectHotelSchema.safeParse({
        ...baseValid,
        name: bad,
      });
      expect(result.success).toBe(false);
    });
  }
});

describe('selectCarRentalSchema provider/car_name allowlist', () => {
  const baseValid = {
    total_price: 300,
    currency: 'USD',
  };

  for (const bad of BAD_INPUTS) {
    it(`rejects provider=${JSON.stringify(bad).slice(0, 40)}`, () => {
      const result = selectCarRentalSchema.safeParse({
        ...baseValid,
        provider: bad,
        car_name: 'Toyota Camry',
      });
      expect(result.success).toBe(false);
    });

    it(`rejects car_name=${JSON.stringify(bad).slice(0, 40)}`, () => {
      const result = selectCarRentalSchema.safeParse({
        ...baseValid,
        provider: 'Hertz',
        car_name: bad,
      });
      expect(result.success).toBe(false);
    });
  }
});

describe('selectExperienceSchema name allowlist', () => {
  const baseValid = {
    estimated_cost: 30,
  };

  for (const bad of BAD_INPUTS) {
    it(`rejects name=${JSON.stringify(bad).slice(0, 40)}`, () => {
      const result = selectExperienceSchema.safeParse({
        ...baseValid,
        name: bad,
      });
      expect(result.success).toBe(false);
    });
  }
});
```

- [ ] **Add missing imports** to the test file's import block. The current imports are:

```typescript
import {
  searchCarRentalsSchema,
  searchExperiencesSchema,
  searchFlightsSchema,
  searchHotelsSchema,
  selectFlightSchema,
  selectHotelSchema,
} from 'app/tools/schemas.js';
```

Add `selectCarRentalSchema` and `selectExperienceSchema`:

```typescript
import {
  searchCarRentalsSchema,
  searchExperiencesSchema,
  searchFlightsSchema,
  searchHotelsSchema,
  selectCarRentalSchema,
  selectExperienceSchema,
  selectFlightSchema,
  selectHotelSchema,
} from 'app/tools/schemas.js';
```

- [ ] **Run tests, confirm FAIL:**

```bash
cd server && pnpm test -- --reporter=verbose src/tools/schemas.test.ts
```

Expected: new tests for `categories`, `airline`, `flight_number`, `name`, `provider`, `car_name` all fail because those fields currently accept bad inputs.

- [ ] **Implement the fix** in `server/src/tools/schemas.ts`. Replace these field definitions:

Line 49 -- change:

```typescript
categories: z.array(z.string().min(1).max(50)).min(1),
```

to:

```typescript
categories: z.array(locationAllowlist).min(1),
```

Lines 83-84 -- change:

```typescript
airline: z.string().min(1),
flight_number: z.string().min(1),
```

to:

```typescript
airline: locationAllowlist,
flight_number: locationAllowlist,
```

Line 94 -- change:

```typescript
name: z.string().min(1),
```

to (inside `selectHotelSchema`):

```typescript
name: locationAllowlist,
```

Lines 105-106 -- change:

```typescript
provider: z.string().min(1),
car_name: z.string().min(1),
```

to:

```typescript
provider: locationAllowlist,
car_name: locationAllowlist,
```

Line 114 -- change:

```typescript
name: z.string().min(1),
```

to (inside `selectExperienceSchema`):

```typescript
name: locationAllowlist,
```

- [ ] **Run tests, confirm PASS:**

```bash
cd server && pnpm test -- --reporter=verbose src/tools/schemas.test.ts
```

- [ ] **Run full verification:**

```bash
pnpm format:check && pnpm lint && pnpm test && pnpm build
```

- [ ] **Commit:**

```bash
pnpm exec prettier --config prettier.config.bottomlessmargaritas.mjs --write server/src/tools/schemas.ts server/src/tools/schemas.test.ts
git add server/src/tools/schemas.ts server/src/tools/schemas.test.ts
git commit -m "fix(SEC): apply locationAllowlist to categories and select_* string fields

Hardens searchExperiencesSchema.categories[], selectFlightSchema
airline/flight_number, selectHotelSchema name, selectCarRentalSchema
provider/car_name, and selectExperienceSchema name against injection."
```

---

## Task 4: Add message length validation to chat handler [standard]

**Files:** `server/src/handlers/chat/chat.ts`, `server/src/handlers/chat/chat.test.ts`

**Context:** The chat handler validates that `message` is a non-empty string (lines 51-53) but has no upper-bound length check. A malicious or accidental oversized payload goes straight to the LLM context, wasting tokens and potentially exceeding API limits.

### Steps

- [ ] **Write failing test** in `server/src/handlers/chat/chat.test.ts`. Add this test inside the `describe('POST /trips/:id/chat')` block, after the `'returns 400 when message is missing'` test:

```typescript
it('returns 400 when message exceeds 2000 characters', async () => {
  const app = createApp();
  const oversized = 'x'.repeat(2001);

  const res = await request(app)
    .post(`/trips/${tripId}/chat`)
    .send({ message: oversized });

  expect(res.status).toBe(400);
  expect(res.body.message).toContain('2000');
});
```

- [ ] **Run test, confirm FAIL:**

```bash
cd server && pnpm test -- --reporter=verbose src/handlers/chat/chat.test.ts
```

Expected: the oversized message passes the current validation and proceeds (likely hitting 404 for trip-not-found, not 400).

- [ ] **Implement the fix** in `server/src/handlers/chat/chat.ts`. After line 53 (`throw ApiError.badRequest('message is required');`), before the closing `}` of that if-block, add the length constant and check. Replace:

```typescript
const { message } = req.body;

if (!message || typeof message !== 'string') {
  throw ApiError.badRequest('message is required');
}
```

with:

```typescript
const MAX_MESSAGE_LENGTH = 2000;
const { message } = req.body;

if (!message || typeof message !== 'string') {
  throw ApiError.badRequest('message is required');
}

if (message.length > MAX_MESSAGE_LENGTH) {
  throw ApiError.badRequest(
    `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
  );
}
```

- [ ] **Run test, confirm PASS:**

```bash
cd server && pnpm test -- --reporter=verbose src/handlers/chat/chat.test.ts
```

- [ ] **Run full verification:**

```bash
pnpm format:check && pnpm lint && pnpm test && pnpm build
```

- [ ] **Commit:**

```bash
pnpm exec prettier --config prettier.config.bottomlessmargaritas.mjs --write server/src/handlers/chat/chat.ts server/src/handlers/chat/chat.test.ts
git add server/src/handlers/chat/chat.ts server/src/handlers/chat/chat.test.ts
git commit -m "fix(SEC): add MAX_MESSAGE_LENGTH=2000 validation to chat handler

Prevents oversized payloads from reaching the LLM context. Returns 400
with a clear message when the limit is exceeded."
```

---

## Task 5: Gate test-selections route and add updateTrip Zod validation [standard]

**Files:** `server/src/routes/trips.ts`, `server/src/schemas/trips.ts`, `server/src/handlers/trips/trips.ts`, `server/src/handlers/trips/trips.test.ts`, `server/src/schemas/trips.test.ts`

**Context:** Two independent sub-fixes in one task because they share test files:

1. The `POST /:id/test-selections` route is registered unconditionally (line 23 of `routes/trips.ts`). The handler returns 404 unless `E2E_BYPASS_RATE_LIMITS=1`, but the route itself still appears in Express's routing table in production. Gating route registration on `NODE_ENV !== 'production'` removes it entirely.

2. The `updateTrip` handler destructures `req.body` directly (lines 64-84 of `handlers/trips/trips.ts`) without Zod validation. It accepts `destination`, `origin`, `departure_date`, `return_date`, `budget_total`, `travelers`, `transport_mode`, `trip_type`, and `status`. A `updateTripSchema` needs to be created in `schemas/trips.ts` and applied.

### Steps

- [ ] **Write failing tests.** Add to `server/src/schemas/trips.test.ts`:

```typescript
import { createTripSchema, updateTripSchema } from './trips.js';

// ... existing createTripSchema tests ...

describe('updateTripSchema', () => {
  it('accepts a partial update with only destination', () => {
    const result = updateTripSchema.safeParse({ destination: 'Tokyo' });
    expect(result.success).toBe(true);
  });

  it('accepts a partial update with only status', () => {
    const result = updateTripSchema.safeParse({ status: 'saved' });
    expect(result.success).toBe(true);
  });

  it('accepts all fields together', () => {
    const result = updateTripSchema.safeParse({
      destination: 'Paris',
      origin: 'JFK',
      departure_date: '2026-08-01',
      return_date: '2026-08-10',
      budget_total: 5000,
      travelers: 2,
      transport_mode: 'flying',
      trip_type: 'round_trip',
      status: 'saved',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status enum', () => {
    const result = updateTripSchema.safeParse({ status: 'deleted' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid transport_mode enum', () => {
    const result = updateTripSchema.safeParse({
      transport_mode: 'teleporting',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid trip_type enum', () => {
    const result = updateTripSchema.safeParse({ trip_type: 'multi_city' });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive budget_total', () => {
    const result = updateTripSchema.safeParse({ budget_total: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer travelers', () => {
    const result = updateTripSchema.safeParse({ travelers: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects empty object (at least one field required)', () => {
    const result = updateTripSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = updateTripSchema.safeParse({
      destination: 'Rome',
      malicious_field: 'drop table',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('malicious_field' in result.data).toBe(false);
    }
  });
});
```

- [ ] Add to `server/src/handlers/trips/trips.test.ts` inside `describe('PUT /trips/:id (updateTrip)')`:

```typescript
it('returns 400 when body contains only unknown fields', async () => {
  const res = await request(app)
    .put(`/trips/${tripId}`)
    .send({ evil_field: 'drop table', hack: true });
  expect(res.status).toBe(400);
});

it('returns 400 when transport_mode is an invalid value', async () => {
  const res = await request(app)
    .put(`/trips/${tripId}`)
    .send({ transport_mode: 'teleporting' });
  expect(res.status).toBe(400);
});
```

- [ ] **Update the import** in `server/src/schemas/trips.test.ts`. Change:

```typescript
import { createTripSchema } from './trips.js';
```

to:

```typescript
import { createTripSchema, updateTripSchema } from './trips.js';
```

- [ ] **Run tests, confirm FAIL:**

```bash
cd server && pnpm test -- --reporter=verbose src/schemas/trips.test.ts src/handlers/trips/trips.test.ts
```

Expected: `updateTripSchema` does not exist yet, so the import fails. The handler tests for unknown fields may pass coincidentally (current handler throws "No fields to update") or fail depending on the body shape.

- [ ] **Implement: create updateTripSchema** in `server/src/schemas/trips.ts`. Add after the `createTripSchema` definition and before the `CreateTripInput` type:

```typescript
export const updateTripSchema = z
  .object({
    destination: z.string().min(1).optional(),
    origin: z.string().optional(),
    departure_date: z.string().optional(),
    return_date: z.string().optional(),
    budget_total: z.number().positive().optional(),
    travelers: z.number().int().positive().optional(),
    transport_mode: z.enum(['flying', 'driving']).optional(),
    trip_type: z.enum(['round_trip', 'one_way']).optional(),
    status: z.enum(['planning', 'saved', 'archived']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export type UpdateTripInput = z.infer<typeof updateTripSchema>;
```

- [ ] **Implement: use updateTripSchema in the handler.** In `server/src/handlers/trips/trips.ts`, add the import. Change:

```typescript
import { createTripSchema } from 'app/schemas/trips.js';
```

to:

```typescript
import { createTripSchema, updateTripSchema } from 'app/schemas/trips.js';
```

Then replace the manual destructuring block in `updateTrip` (lines 64-84). Change:

```typescript
const {
  destination,
  origin,
  departure_date,
  return_date,
  budget_total,
  travelers,
  transport_mode,
  trip_type,
  status,
} = req.body ?? {};
const input: Record<string, unknown> = {};
if (destination !== undefined) input.destination = destination;
if (origin !== undefined) input.origin = origin;
if (departure_date !== undefined) input.departure_date = departure_date;
if (return_date !== undefined) input.return_date = return_date;
if (budget_total !== undefined) input.budget_total = budget_total;
if (travelers !== undefined) input.travelers = travelers;
if (transport_mode !== undefined) input.transport_mode = transport_mode;
if (trip_type !== undefined) input.trip_type = trip_type;
if (status !== undefined) input.status = status;
```

to:

```typescript
const parsed = updateTripSchema.safeParse(req.body ?? {});
if (!parsed.success) {
  const message = parsed.error.issues.map((e) => e.message).join('; ');
  throw ApiError.badRequest(message);
}
const input = parsed.data;
const { destination, departure_date, return_date, budget_total } = input;
```

Then update the remaining references. The existing code after the destructuring uses `destination`, `departure_date`, `return_date`, and `budget_total` by name for date validation and the destination-change detection. Those destructured names still work from `input`. Remove the now-redundant "No fields to update" check:

```typescript
if (Object.keys(input).length === 0) {
  throw ApiError.badRequest('No fields to update');
}
```

This block is no longer needed because the `.refine()` on the schema already rejects empty objects.

- [ ] **Implement: gate the test-selections route.** In `server/src/routes/trips.ts`, change:

```typescript
// Test-only seam (ENG-17). The handler itself returns 404 unless
// E2E_BYPASS_RATE_LIMITS=1 is set, so this route is invisible in
// production. See server/src/handlers/trips/trips.ts::seedSelections.
tripRouter.post('/:id/test-selections', tripHandlers.seedSelections);
```

to:

```typescript
// Test-only seam (ENG-17). The handler returns 404 unless
// E2E_BYPASS_RATE_LIMITS=1, and the route is not registered at all
// in production. Double gate: route registration + handler check.
if (process.env.NODE_ENV !== 'production') {
  tripRouter.post('/:id/test-selections', tripHandlers.seedSelections);
}
```

- [ ] **Run tests, confirm PASS:**

```bash
cd server && pnpm test -- --reporter=verbose src/schemas/trips.test.ts src/handlers/trips/trips.test.ts
```

- [ ] **Run full verification:**

```bash
pnpm format:check && pnpm lint && pnpm test && pnpm build
```

- [ ] **Commit:**

```bash
pnpm exec prettier --config prettier.config.bottomlessmargaritas.mjs --write server/src/routes/trips.ts server/src/schemas/trips.ts server/src/handlers/trips/trips.ts server/src/handlers/trips/trips.test.ts server/src/schemas/trips.test.ts
git add server/src/routes/trips.ts server/src/schemas/trips.ts server/src/handlers/trips/trips.ts server/src/handlers/trips/trips.test.ts server/src/schemas/trips.test.ts
git commit -m "fix(SEC): gate test-selections route on NODE_ENV, add updateTrip Zod validation

1. Route registration for POST /:id/test-selections is now conditional
   on NODE_ENV !== 'production' (double gate with handler check).
2. updateTrip handler now validates req.body through updateTripSchema
   (Zod) instead of raw destructuring. Unknown fields are stripped.
   Invalid enum values and non-positive numbers are rejected."
```

---

## Verification

After all 5 tasks, run the full suite from monorepo root:

```bash
pnpm format:check && pnpm lint && pnpm test && pnpm build
```

All security findings from the 2026-05-27 audit batch 1 are addressed.
