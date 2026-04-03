# Agentic Chat Redesign — Design Spec

**Goal:** Replace the per-category state machine with a completion tracker that gives Claude genuine agency over the trip planning conversation. Claude sees what's been completed and decides what to do next, while server-side guardrails ensure nothing gets missed. Also expand from 30 to 34 curated destinations.

**Problem:** The current per-category state machine (12 micro-prompts across 4 categories × 3 statuses) reduces Claude to a fetch service. It dictates exactly what question to ask, in what order, with what phrasing. The result feels like a form wizard with AI-generated text, not an agentic travel advisor.

---

## 1. Architecture — From State Machine to Completion Tracker

### Current

The server computes `FlowPosition` (COLLECT_DETAILS → CATEGORY(flights.idle) → CATEGORY(hotels.asking) → ...) and swaps Claude's entire system prompt based on position. `advanceBookingState()` transitions states after each turn. Claude is told exactly what to ask and when.

### New

The server maintains a **completion tracker** — a simple record of what's been booked, skipped, or is still pending. The tracker is injected into the system prompt as a dynamic checklist. Claude decides what to do with it.

```typescript
interface CompletionTracker {
  version: number;
  transport: 'pending' | 'flying' | 'driving';
  flights: 'pending' | 'searching' | 'selected' | 'skipped';
  hotels: 'pending' | 'searching' | 'selected' | 'skipped';
  car_rental: 'pending' | 'searching' | 'selected' | 'skipped';
  experiences: 'pending' | 'searching' | 'selected' | 'skipped';
  turns_since_last_progress: number;
}
```

`getFlowPosition()` is simplified to three phases:

- **COLLECT_DETAILS** — missing destination, origin, or departure_date
- **PLANNING** — the main conversation (replaces all CATEGORY states)
- **COMPLETE** — trip status is no longer 'planning'

There is no per-category phase. During PLANNING, Claude has full autonomy over what to discuss and in what order.

---

## 2. The Single System Prompt

Replace the 12 micro-prompts (`CATEGORY_PROMPTS` with idle/asking/presented × 4 categories) with one persistent prompt. The prompt has these sections:

### Role & Personality (static)

> You are Voyager, an expert travel planning advisor. You help users plan trips by searching for flights, hotels, car rentals, and experiences that match their preferences and budget. You're knowledgeable, enthusiastic when you have something genuinely useful to share, and concise when the situation is transactional. You're a real advisor — you make recommendations, explain trade-offs, and share relevant local knowledge.

### Response Guidelines (static)

> Keep responses under ~100 words. Be concise for transactional exchanges (presenting search results, confirming selections). Be more detailed when advising (recommending a neighborhood, warning about weather, explaining a budget trade-off). Never restate what the UI cards already show — the user can see them. Never fabricate options or availability.

### Tools (static)

Describes each tool's purpose and when to use it. Not "call search_flights when in flights.asking" but "use search_flights when the user wants to explore flight options or you're proactively helping them find transportation." Each tool gets a one-sentence description of its purpose and appropriate use.

### Trip Checklist (dynamic, rebuilt each turn)

```markdown
## Trip Planning Checklist

- ✅ Transportation: Flying
- ✅ Flights: Delta DL123 JFK→CDG — $487
- ⬜ Hotels: Not yet discussed
- ⬜ Car Rental: Not yet discussed
- ⬜ Experiences: Not yet discussed
- Budget: $1,513 remaining of $3,000

All categories must be addressed (selected or explicitly skipped) before the trip can be confirmed.
```

### User Preferences (dynamic)

Same content as current `formatTripContext` output — accommodation style, dining, activities, travel party, safety context (LGBTQ+, gender, solo), dietary restrictions.

### Guardrails (static)

All the hardening from the edge case spec:

- Off-topic: answer briefly if harmless, redirect to trip
- Multi-city: explain one destination per trip
- Destination change: warn about clearing selections
- Health/safety: proactively surface advisory risks
- Budget: warn when over budget, never block
- Impossible requests: explain honestly, suggest alternatives
- Critical advisory: Level 4 warn-and-confirm

### Server Nudge (conditional)

Only injected when `turns_since_last_progress >= 3` and uncompleted categories exist:

> Note: you haven't discussed [hotels, experiences] with the user yet. Find a natural moment to bring this up.

Maximum one nudge per turn. Clears when any category status changes.

---

## 3. Server-Side Nudge Mechanism

After each turn, the server checks the completion tracker:

1. Increment `turns_since_last_progress`
2. If any category status changed this turn, reset `turns_since_last_progress` to 0
3. If `turns_since_last_progress >= 3` and uncompleted categories exist, compute nudge string listing the pending categories
4. Pass nudge string to `buildSystemPrompt` (injected as a conditional section)
5. Maximum one nudge per turn

The **confirm gate** (already built) remains as the hard safety net. If the user requests booking confirmation with all categories skipped/pending and none selected, Claude must address the gap before confirming.

---

## 4. Completion Tracker Updates

After each agent turn, the server updates the tracker by inspecting what happened:

1. **Search tools called** → mark those categories as `searching`
2. **Select tools called** → mark those categories as `selected`
3. **`format_response` with `skip_category`** → mark the named category as `skipped`
4. **Trip record check** → any category with rows in its selection table is `selected` (ground truth)
5. **Transport mode** → if `update_trip` set `transport_mode`, update tracker's `transport` field; auto-mark flights as `skipped` when driving

### skip_category Change

Currently `skip_category` is a boolean. Since Claude is no longer locked into one category per turn, it needs to specify which category is being skipped. Change to: `skip_category: 'flights' | 'hotels' | 'car_rental' | 'experiences'` (string instead of boolean).

The `format_response` tool definition schema updates accordingly.

---

## 5. What Gets Removed

### Removed

- `CATEGORY_PROMPTS` object (12 micro-prompts)
- `getCategoryPrompt()` function
- `getPhasePrompt()` function (COLLECT_DETAILS/CONFIRM/COMPLETE prompts folded into single prompt with phase awareness)
- `CategoryStatus` type (`idle | asking | presented | done | skipped`)
- `CATEGORY_ORDER` constant (Claude decides the order)
- `advanceBookingState()` function (replaced by simpler `updateCompletionTracker()`)
- The idle→asking promotion in the chat handler
- Per-category preference injection in `getCategoryPrompt` (moved into trip context section)

### Kept

- Completion tracker concept (renamed from `BookingState`) — still stored as JSONB on conversations
- `normalizeBookingState()` — renamed to `normalizeCompletionTracker()`, still handles versioning/migration
- `SEARCH_TOOLS` and `SELECTION_KEYS` maps — still used by tracker update logic
- `format_response` tool — unchanged except `skip_category` type
- All guardrails from edge case hardening — moved into single prompt
- Empty itinerary block / confirm gate — kept as server-side safety net
- `FlowPosition` — simplified to 3 phases (COLLECT_DETAILS, PLANNING, COMPLETE)

### Migration

The existing `BookingState` (version 1) with `idle/asking/presented/done/skipped` statuses needs a v2 migration in the normalizer:

- `idle` or `asking` → `pending`
- `presented` → `searching`
- `done` → `selected`
- `skipped` → `skipped`

New `turns_since_last_progress` field defaults to 0.

---

## 6. Destination Expansion (30 → 34)

### Add 4 New Destination Pages

These already have Unsplash images in `destinationImage.ts`:

- Auckland, New Zealand
- Lima, Peru
- Mexico City, Mexico
- Mumbai, India

Each gets a full entry in `destinations.ts` with all 15 required fields: slug, name, country, categories, price_level, best_season, description, currency, language, estimated_daily_budget, visa_summary, top_experiences (10 items), dining_highlights (4-6 items), neighborhoods (3-4 areas), weather (12 months).

### Add Images for 3 Existing Destinations

These have destination pages but no Unsplash photo ID:

- Cusco — source a real Unsplash photo ID and verify with HTTP 200
- Maldives — source a real Unsplash photo ID and verify with HTTP 200
- Naples — source a real Unsplash photo ID and verify with HTTP 200

### Result

All 34 destinations have both a full content page and a verified Unsplash image. No mismatches between `destinations.ts` and `destinationImage.ts`.

---

## Summary of Changes

### Server-Side

| Change                                             | File(s)                                           |
| -------------------------------------------------- | ------------------------------------------------- |
| CompletionTracker type + normalizer (v2 migration) | `booking-steps.ts` (rename/rewrite)               |
| Simplified FlowPosition (3 phases)                 | `booking-steps.ts`                                |
| updateCompletionTracker function                   | `booking-steps.ts` (replaces advanceBookingState) |
| Single system prompt builder                       | `system-prompt.ts` (rewrite)                      |
| Remove category-prompts.ts                         | `category-prompts.ts` (delete or gut)             |
| Nudge mechanism (turns_since_last_progress)        | `chat.ts`, `system-prompt.ts`                     |
| skip_category: boolean → string                    | `definitions.ts` (format_response schema)         |
| Chat handler simplification                        | `chat.ts` (remove state machine orchestration)    |

### Frontend

| Change                    | File(s)               |
| ------------------------- | --------------------- |
| 4 new destination entries | `destinations.ts`     |
| 3 new Unsplash image IDs  | `destinationImage.ts` |

### Tests

| Change                                                 | File(s)                    |
| ------------------------------------------------------ | -------------------------- |
| CompletionTracker tests (replaces booking-steps tests) | `booking-steps.test.ts`    |
| System prompt tests (single prompt)                    | `system-prompt.test.ts`    |
| Category prompts tests removed or rewritten            | `category-prompts.test.ts` |
| Chat handler tests updated                             | `chat.test.ts`             |
