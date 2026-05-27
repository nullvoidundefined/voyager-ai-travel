# Docs/Cleanup Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 6 docs and cleanup findings: stale tool-call limit in docs, dead metrics service, grep-based test replacement, ChatBox magic string, and settings cleanup.

**Architecture:** Documentation fixes, dead code removal, and test improvements. No new features.

**Tech Stack:** Markdown, TypeScript, Vitest, @testing-library/react

---

## Task 1: Fix stale 15-call limit in docs [trivial]

The server code already uses `DEFAULT_MAX_ITERATIONS = 8` (in `server/src/services/AgentOrchestrator.ts:12`). Three doc files still reference "15".

### Steps

- [ ] **1a.** Edit `CLAUDE.md` line 7. Replace:

```markdown
Agentic tool-use loop: Claude calls tools 3-8 times per turn, reasoning about results between calls. Unlike app 3 (single-pass tool use), this is multi-step with budget-aware planning. Max 15 tool calls per turn as safety limit.
```

with:

```markdown
Agentic tool-use loop: Claude calls tools 3-8 times per turn, reasoning about results between calls. Unlike app 3 (single-pass tool use), this is multi-step with budget-aware planning. Max 8 tool calls per turn as safety limit.
```

- [ ] **1b.** Edit `README.md` line 48. Replace:

```markdown
5. The loop continues until Claude issues an `end_turn` stop reason or the 15-call safety limit is reached.
```

with:

```markdown
5. The loop continues until Claude issues an `end_turn` stop reason or the 8-call safety limit is reached.
```

- [ ] **1c.** Edit `README.md` line 201. Replace:

```markdown
Add all five tools. Implement the 15-call safety limit. Full trip persistence (create, save, list, load). Conversation history with tool call logging. Itinerary display components. Multi-turn iteration.
```

with:

```markdown
Add all five tools. Implement the 8-call safety limit. Full trip persistence (create, save, list, load). Conversation history with tool call logging. Itinerary display components. Multi-turn iteration.
```

- [ ] **1d.** Edit `README.md` line 212. The line currently reads `**15-call safety limit**` followed by a U+2014 em dash and explanation text. Change `15` to `8`. Also fix the em dash (U+2014) to a double hyphen while you are on this line, per R-001. The result should be:

```markdown
- **8-call safety limit** -- Prevents runaway agent loops from burning API quota or hanging.
```

Note: lines 209-211 and 213 in `README.md` also contain U+2014 em dashes. Fix those to double hyphens in the same edit to avoid a follow-up formatting commit.

- [ ] **1e.** Commit:

```bash
git add CLAUDE.md README.md
git commit -m "docs: update stale 15-call limit references to 8

Server code uses DEFAULT_MAX_ITERATIONS = 8 since the orchestrator
rewrite. Three doc references still said 15."
```

---

## Task 2: Delete dead metrics service [trivial]

`server/src/services/metrics.service.ts` (112 lines) exports a `MetricsService` interface and `LogMetricsService` class. Zero production call sites; the only import is in its own test file.

### Steps

- [ ] **2a.** Verify no production imports exist (only the test file should reference it):

```bash
grep -rn "metrics.service" server/src/ --include="*.ts" | grep -v "metrics.service.test.ts" | grep -v "metrics.service.ts"
```

Expected output: empty. If any production import is found, stop and reassess.

- [ ] **2b.** Delete both files:

```bash
rm server/src/services/metrics.service.ts
rm server/src/services/metrics.service.test.ts
```

- [ ] **2c.** Verify the server still builds and tests pass:

```bash
pnpm --filter voyager-server run build
pnpm --filter voyager-server run test
```

- [ ] **2d.** Commit:

```bash
git add server/src/services/metrics.service.ts server/src/services/metrics.service.test.ts
git commit -m "chore: delete dead metrics service

MetricsService had zero production call sites. The only import was
its own test file. Remove both."
```

---

## Task 3: Replace BookingConfirmation grep test with render tests [standard]

`web-client/src/components/BookingConfirmation/BookingConfirmation.content.test.ts` uses `readFileSync` to grep the source file for anti-patterns. Replace with actual render tests that assert the same invariants by rendering the component.

### Context

The component (`BookingConfirmation.tsx`) requires these props:

```typescript
interface BookingConfirmationProps {
  destination: string;
  departureDate: string | null;
  returnDate: string | null;
  flights: FlightSummary[];
  hotels: HotelSummary[];
  carRentals: CarRentalSummary[];
  experiences: ExperienceSummary[];
  budgetTotal: number | null;
  budgetCurrency: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

It uses `next/image` and `@/lib/destinationImage`, both of which need mocking. The test environment is jsdom with `@testing-library/react`.

### Steps

- [ ] **3a.** Delete the old grep-based test and create the new render test file at `web-client/src/components/BookingConfirmation/BookingConfirmation.content.test.tsx` (note `.tsx` extension):

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BookingConfirmation } from './BookingConfirmation';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    return <img data-fill={fill} {...rest} />;
  },
}));

vi.mock('@/lib/destinationImage', () => ({
  getDestinationImage: () => ({ url: null, credit: null }),
}));

afterEach(cleanup);

const defaultProps = {
  destination: 'Barcelona',
  departureDate: '2026-07-01',
  returnDate: '2026-07-08',
  flights: [
    {
      airline: 'Iberia',
      flight_number: 'IB101',
      origin: 'JFK',
      destination: 'BCN',
      price: 450,
      currency: 'USD',
    },
  ],
  hotels: [{ name: 'Hotel Arts', total_price: 1200, currency: 'USD' }],
  carRentals: [],
  experiences: [],
  budgetTotal: 3000,
  budgetCurrency: 'USD',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

/**
 * Content guards for BookingConfirmation.
 *
 * Guards the UX-02 / CRIT-02 fix: the pre-audit component ran a
 * hard-coded 2200ms "booking..." spinner followed by a 1500ms
 * "confirmed!" state and then auto-called onConfirm. These tests
 * verify the component uses honest language and has no auto-dismiss.
 */
describe('BookingConfirmation content', () => {
  it('renders "Save itinerary" button text, not "Confirm Booking"', () => {
    render(<BookingConfirmation {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: 'Save itinerary' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Confirm Booking')).not.toBeInTheDocument();
  });

  it('renders disclaimer that nothing is actually booked', () => {
    render(<BookingConfirmation {...defaultProps} />);

    expect(screen.getByText(/Nothing is actually booked/)).toBeInTheDocument();
  });

  it('does not auto-dismiss or auto-confirm on a timer', () => {
    vi.useFakeTimers();

    const onConfirm = vi.fn();
    render(<BookingConfirmation {...defaultProps} onConfirm={onConfirm} />);

    // Advance past the old 2200ms + 1500ms auto-confirm window
    vi.advanceTimersByTime(5000);

    expect(onConfirm).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
```

- [ ] **3b.** Run the new tests to verify they pass:

```bash
pnpm --filter voyager-web-client run test -- --run src/components/BookingConfirmation/BookingConfirmation.content.test.tsx
```

- [ ] **3c.** Commit:

```bash
git add web-client/src/components/BookingConfirmation/BookingConfirmation.content.test.ts web-client/src/components/BookingConfirmation/BookingConfirmation.content.test.tsx
git commit -m "test: replace BookingConfirmation grep test with render tests

The old test used readFileSync to grep the source for anti-patterns.
Replace with actual RTL render tests that assert button text,
disclaimer copy, and absence of auto-dismiss timer behavior."
```

---

## Task 4: Replace ChatBox magic string with constant [standard]

`ChatBox.tsx` line 104 compares against a bare string `'Confirm booking'`. Extract to a named constant and add a brief comment explaining the fallback behavior.

### Steps

- [ ] **4a.** Add the constant near the top of `web-client/src/components/ChatBox/ChatBox.tsx`, after the imports and before the `ChatBoxProps` interface. Replace:

```typescript
interface ChatBoxProps {
```

with:

```typescript
/**
 * Users may type this phrase in chat; treat it as clicking the book button.
 * The primary booking UX is the BookingPrompt button, but this intercept
 * catches the text-based fallback so the modal still opens.
 */
const BOOKING_CONFIRMATION_TRIGGER = 'Confirm booking';

interface ChatBoxProps {
```

- [ ] **4b.** Replace the magic string usage in `handleSend`. The existing comment on line 103 contains a U+2014 em dash; fix it to a double hyphen at the same time (R-001). The current code reads:

```
      // Intercept booking confirmation <U+2014> open modal instead of sending chat message
      if (msg.trim() === 'Confirm booking') {
```

Replace with:

```typescript
      // Intercept booking confirmation -- open modal instead of sending chat message
      if (msg.trim() === BOOKING_CONFIRMATION_TRIGGER) {
```

- [ ] **4c.** Add a test to the ChatBox invariants spec at `web-client/src/components/ChatBox/ChatBox.invariants.test.tsx`. Read the file to find the correct insertion point (end of the describe block), then add a new `describe` block after the existing ones:

```typescript
describe('ChatBox magic-string guard', () => {
  it('BOOKING_CONFIRMATION_TRIGGER constant is exported from ChatBox source', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, 'ChatBox.tsx'),
      'utf-8',
    );
    expect(src).toContain(
      "const BOOKING_CONFIRMATION_TRIGGER = 'Confirm booking'",
    );
    expect(src).not.toMatch(/===\s*['"]Confirm booking['"]/);
  });
});
```

Note: the invariants test file already imports `fs` and `path` (lines 3-4). This test verifies the constant exists and that no bare string comparison against `'Confirm booking'` remains.

- [ ] **4d.** Run the tests:

```bash
pnpm --filter voyager-web-client run test -- --run src/components/ChatBox/ChatBox.invariants.test.tsx
```

- [ ] **4e.** Commit:

```bash
git add web-client/src/components/ChatBox/ChatBox.tsx web-client/src/components/ChatBox/ChatBox.invariants.test.tsx
git commit -m "refactor: extract ChatBox booking magic string to constant

Replace bare 'Confirm booking' string comparison with named
BOOKING_CONFIRMATION_TRIGGER constant. Add invariant test verifying
no bare string comparison remains."
```

---

## Skipped Items

### FULL_APPLICATION_SPEC.md reference in .claude/bottomlessmargaritas/CLAUDE.md

No reference to `FULL_APPLICATION_SPEC.md` was found in `.claude/bottomlessmargaritas/CLAUDE.md`. Nothing to fix.

### .claude/settings.local.json stale permissions

The criticism audit mentioned "stale permissions for deleted project paths" but did not identify specific entries. The file is a permissions allowlist; stale entries are harmless (they allow actions on paths that no longer exist). No action unless specific stale entries are identified.

---

## Final Verification

After all tasks are complete:

- [ ] Run full verification from monorepo root:

```bash
pnpm format:check && pnpm lint && pnpm test && pnpm build
```

- [ ] Verify no references to "15-call" remain in docs:

```bash
grep -rn "15-call\|15 tool calls\|15-call safety" CLAUDE.md README.md
```

Expected: empty output.

- [ ] Verify no imports of metrics.service remain:

```bash
grep -rn "metrics.service" server/src/ --include="*.ts"
```

Expected: empty output.
