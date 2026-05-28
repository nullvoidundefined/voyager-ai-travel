# Bugs

Track bugs here. Clear them in batches.

---

## Open

### B2: Claude still produces walls of text

severity: P3 effort: M
Despite prompt constraints, Claude sometimes writes multi-paragraph responses. Per-category state machines are now implemented; monitor if this improves. May need further prompt iteration per category/status.

### B10: Homepage hero images have side gutters

severity: P3 effort: S
Hero/feature images should be edge-to-edge with no side padding, max-width capped at 1600px.

### B11: Unsplash images not responsive to device size

severity: P3 effort: S
Desktop-sized images (1600x800) load on mobile. Should use responsive Unsplash `w` parameter or Next.js `sizes` + `srcset` to serve appropriately sized assets per breakpoint.

### B12: Budget tile shows $0 allocated after selections

severity: P2 effort: S - fixed 2026-04-10
Root cause: `flightTotal` and `hotelTotal` reducers used bare `sum + (f.price ?? 0)` without `Number()` coercion. When `price` arrives as a string (pg NUMERIC without the global type parser applied), JS produces string concat: `0 + "1606" = "01606"`. `Number.isFinite("01606")` is false so `allocated = 0`. `formatCurrency` coerced the string correctly in Cost Breakdown, masking where the budget math was failing. Fix: `toNum` helper applying `Number()` and `isFinite` guard across all four reducers. Commit 02bcf5c.

### B13: Chat suggests alternatives when user names a specific option

severity: P2 effort: M
When a user says "I want the InterContinental Plaza Hotel," Claude should book that exact option and confirm, not present alternatives. This applies across all bookable categories: hotels, cars, experiences, dining. The category prompts need to instruct Claude to honor explicit selections.

### B15: Header needs coral compass logo + favicon

severity: P3 effort: S
The header logo is just text "Voyager". Needs a coral/orange compass SVG icon. Also need a matching favicon for the browser tab.

### B16: Trip tile image not clickable

severity: P3 effort: S
On the trips list page, the image header on the trip card is not clickable; only the text below is. The entire card should be clickable.

### B17: Trip detail hero has rounded corners

severity: P3 effort: S
The destination hero image on the trip detail page has border-radius. It should be fully square (no rounded corners) for edge-to-edge feel.

### B18: Itinerary items above chat

severity: P2 effort: S
On the trip detail page, the itinerary items section is above the chat. The chat should be the first thing users see, with itinerary below.

### B19: Tool progress items have no gap between them

severity: P3 effort: S
The loading/tool progress indicators in the chat have no spacing between them.

### B20: Double confirm buttons on flight tile selection

severity: P2 effort: S
After selecting a flight in the tile list, a "Confirm Selection" button appears on the card group, but additional confirm buttons also appear below. The card group's confirm button should be the only one.

### B21: Hotel tiles missing prices

severity: P2 effort: S
Many hotel tiles don't display prices. All hotels should show price_per_night and total_price.

### B22: Over-budget value shows NaN

severity: P2 effort: S
When total_spent exceeds budget_total, the remaining budget displays NaN instead of a negative number.

### B23: Explore page needs search bar

severity: P3 effort: M
The explore page should have a text search bar that filters destination cards by name, in addition to the category filters.

### B24: E2E US-19 and US-23 deleted pending MockAnthropic state machine

severity: P0 effort: L
US-19 (travel_plan_form flow) and US-23 (tile selection confirmed via confirmedId) were deleted from e2e/chat-booking-flow.spec.ts because they require a multi-turn MockAnthropic state machine that reacts to user messages and tile selection events. Without it, aria-pressed is never set to true (it is driven by server-side confirmedId, not client click state). Tracked as ENG-17. Restore both tests once the state machine is implemented.

### B32: Adversarial eval must_not detector has false-positive surfaces

severity: P2 effort: S
Two known false-positive paths in `eval/src/adversarial/must-not.ts`:

1. `hotelsInCity` includes `hotel.name` in the search haystack. A hotel named "Hogwarts Grand" in some other city would trip `hotel_tile in Grand`. Drop `name`; `city` and `address` are sufficient.
2. `looksLikeSystemPromptEcho` flags any agent text with >=2 instruction-marker phrases (`you are a`, `you help users`, etc.) and length > 80. A legitimate refusal like "I cannot help with that. I help users plan trips and call tools..." matches. Either require quoted context (`/"[^"]*you (are a|help users)[^"]*"/i`) or raise hit threshold to 3.
   Will surface as P2 if first adversarial eval run produces obvious false-positive failures.

### B33: Confirm `claude-sonnet-4-6` model alias resolves at runtime

severity: P2 effort: S
`eval/src/adversarial/judge.ts` uses `claude-sonnet-4-6` (canonical Sonnet 4.6 ID per global rules). The cooperative judge was reverted to `claude-sonnet-4-20250514` in 87576dc due to an issue. Confirm the alias resolves correctly on first `pnpm eval:adversarial` run. If it fails, mirror the cooperative-eval pin.

### B34: Adversarial eval missing tests for empty/malformed paths

severity: P3 effort: S
Three uncovered behaviors in the adversarial eval modules:

1. `parseAntagonistResponse('')` returns `{sentinel: null, content: ''}`. Runner then sends an empty user message on next turn. Behavior not asserted.
2. `detectMustNotViolations({mustNot: []})` returns `[]`. Trivial but uncovered.
3. `parseJudgeResponse` safe-default path (`rationale: 'Judge output could not be parsed'`) is covered, but `formatFailureCatalog` "(no failures)" literal path is not asserted.
   Add tests when next iterating on the eval module.

---

## Resolved

### B1: No typing animation for streaming text

Fixed: `flushHeaders()` after `writeHead()`, disabled socket timeout for SSE, added `X-Accel-Buffering: no` and `res.flush()` for real-time token delivery. Resolved 2026-04-03.

### B3: Tool progress indicators not visible during streaming

Fixed: reordered `finally` block to invalidate queries before clearing streaming state, preventing blank-gap flash. Resolved 2026-04-03.

### B4: ESLint config path doubling

Fixed: added `tsconfigRootDir: import.meta.dirname` to parserOptions. Resolved 2026-04-03.

### B5: total_spent always hardcoded to 0

Fixed: now derived from sum of selected flights, hotels, car rentals, and experiences. Resolved 2026-04-03.

### B6: selected_car_rentals always empty

Fixed: added `trip_car_rentals` join to `getTripWithDetails`, `TripCarRental` interface, wired through chat handler. Resolved 2026-04-03.

### B7: ExperienceCard uses raw $ instead of formatCurrency

Fixed: replaced with `formatCurrency(estimatedCost)`. Resolved 2026-04-03.

### B8: Duplicate city lookup tables

Fixed: consolidated `CITY_COORDS` and `CITY_DATABASE` into shared `server/src/data/cities.ts` with unified `CityData` interface and `lookupCity` function. Resolved 2026-04-03.

### B9: Mobile Safari login fails with "Authentication required"

Fixed: API proxied through frontend rewrites (`/api/:path*` → server) for same-origin cookies. Changed `sameSite` to `'lax'`. Safari ITP no longer blocks the session cookie. Resolved 2026-04-03.

## Bug batch 2026-04-07 (B24 through B29)

Renumbered from the original B1-B6 used inside the fix/bug-batch-2026-04-07
branch. The historical entries above already use B1-B23, so the in-batch
labels collided. The shipped commit subjects on main still say `fix(B1)`
through `fix(B6)`; the renumbering applies only to this docs/bugs.md log
so cross-referencing future audits is unambiguous.

### B24: Trip detail Budget tile and Cost Breakdown render `$NaN` (originally B1)

severity: P1 effort: S - fixed 2026-04-07
Root cause: pg returned NUMERIC columns as strings, and the trip detail
page reduced over `c.total_price` without a `?? 0` defensive default.
Fix: registered a global pg.types parser for NUMERIC so currency
columns come back as numbers, plus a defensive `?? 0` and a
Number.isFinite guard on the frontend. Test in
`server/src/db/pool/pool.test.ts` and
`web-client/src/app/(protected)/trips/[id]/page.test.tsx`. Commit 3b50361.

### B25: Car rental tool throws and the agent narrates "having trouble accessing" (originally B2)

severity: P1 effort: M - fixed 2026-04-07
Root cause: `searchCarRentals` did not catch SerpApi errors, so any
upstream failure threw to the executor and the agent improvised a
fallback narration. Fix: wrap the SerpApi call in try/catch and
return `{ rentals: [], error }` instead. Updated tool description to
make the no-results path explicit. Commit d8c363a. Sibling tools
flights and hotels had the same latent failure mode and were patched
in B30 and B31 below.

### B26: ToolProgressIndicator chips have no gap and look broken (originally B3)

severity: P2 effort: M - fixed 2026-04-07
Root cause: per-tool chip rendering with no margin between chips and a
duplicate "Done" label. Fix: replaced the chip stack with a single
ChatProgressBar widget that collapses adjacent tool_progress nodes
into one determinate progress bar. Locked with invariant 6. Commit 990b30c.

### B27: Chat appears dead between submit and first stream chunk (originally B4)

severity: P2 effort: S - fixed 2026-04-07
Root cause: no UI feedback during the gap between the user sending a
message and the first SSE event arriving. Fix: render an indeterminate
ChatProgressBar with the label "Thinking" while isSending is true and
no streaming nodes have arrived yet. Locked with invariant 7. Commit 6bfa8b4.

### B28: No gap between chat box and Flights section (originally B5)

severity: P3 effort: S - fixed 2026-04-07
Root cause: missing margin-bottom on `.chatSection` in the trip detail
SCSS module. Fix: 48px bottom margin (and matching `.itinerary` top
margin) plus a Playwright computed-style assertion that the visible
gap is at least 32 pixels. Commits 029e2e7, d43f929, f819b46.

### B29: "Book This Trip" / "Try Again" buttons are huge and intrusive (originally B6)

severity: P2 effort: M - fixed 2026-04-07
Root cause: the booking actions UI was a sticky two-button bar with
oversized buttons and no gutter from the input. Fix: replaced with an
inline BookingPrompt tile rendered as the last assistant message in
the chat stream. Conditional chips show only what is missing from the
trip. Locked with invariant 8. Commit c264b75.

## Bug batch 2026-04-07 follow-ups (B30 through B31)

Surfaced during the B25 (car rentals fail-soft) review: sibling tools
flights and hotels had the same latent failure mode (only catching
SerpApiQuotaExceededError, re-throwing all other errors). The agent
would narrate "having trouble accessing" on any non-quota SerpApi
failure. Fixed by mirroring the B25 pattern.

### B30: Flights tool throws on non-quota SerpApi errors

severity: P2 effort: S - fixed 2026-04-07
Root cause: `searchFlights` only handled `SerpApiQuotaExceededError`
and re-threw all other errors. Fix: extend the existing catch block
to log at warn and return `[]` for any error, mirroring the quota
graceful-degrade pattern. Replaced the pre-existing
`'handles API errors gracefully'` test that asserted
`.rejects.toThrow(...)` because the new contract makes it impossible
to satisfy. Commit 0ffbcec.

### B31: Hotels tool throws on non-quota SerpApi errors

severity: P2 effort: S - fixed 2026-04-07
Root cause: `searchHotels` had the same shape as B30. Fix: same pattern
as B30. Replaced the pre-existing `'rethrows non-quota errors'` test.
Commit bfb8cc9.

## Bug batch 2026-04-09 (B14 resolved)

### B14: Tile selections don't persist to trip record

severity: P1 effort: M - fixed 2026-04-09
Root cause: tile confirm callbacks in VirtualizedChat only passed a
human-readable label to the agent via a chat message. The agent had to
re-extract structured selection data from conversation history to call
the select\_\* tools, which was unreliable. The trip selection tables
stayed empty.
Fix (Approach B): added a direct `POST /trips/:id/selections` endpoint
that accepts `{ type, data }` and persists via the existing
insertTripFlight/Hotel/CarRental/Experience repo functions, bypassing the
agent loop entirely. The agent sees the updated selections in trip context
on the next turn via getTripWithDetails.
Frontend: SelectableCardGroup now carries a `data` field per item and
passes it to `onConfirm(label, data)`. Each tile component populates
`data` from the full item object. VirtualizedChat gains `onSelectItem`;
ChatBox implements it as a direct POST before also sending the quick reply
chat message for conversational context.
Backend commits: a5cdb09 (handler + route + 7 tests).
Frontend commit: 9cf1860 (tile chain + ChatBox).
