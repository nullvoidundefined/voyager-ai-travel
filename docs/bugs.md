# Bugs

Track bugs here. Clear them in batches.

---

## Open

### B2: Claude still produces walls of text

Despite prompt constraints, Claude sometimes writes multi-paragraph responses. Per-category state machines are now implemented — monitor if this improves. May need further prompt iteration per category/status.

### B10: Homepage hero images have side gutters

Hero/feature images should be edge-to-edge with no side padding, max-width capped at 1600px.

### B11: Unsplash images not responsive to device size

Desktop-sized images (1600x800) load on mobile. Should use responsive Unsplash `w` parameter or Next.js `sizes` + `srcset` to serve appropriately sized assets per breakpoint.

### B12: Stale trip metadata after updates

Travel status, budget, and dates can appear invalid or stale after trip modifications. Need an end-to-end audit to ensure trip metadata stays in sync as the trip is modified via the chat agent.

### B13: Chat suggests alternatives when user names a specific option

When a user says "I want the InterContinental Plaza Hotel," Claude should book that exact option and confirm — not present alternatives. This applies across all bookable categories: hotels, cars, experiences, dining. The category prompts need to instruct Claude to honor explicit selections.

### B15: Header needs coral compass logo + favicon

The header logo is just text "Voyager". Needs a coral/orange compass SVG icon. Also need a matching favicon for the browser tab.

### B16: Trip tile image not clickable

On the trips list page, the image header on the trip card is not clickable — only the text below is. The entire card should be clickable.

### B17: Trip detail hero has rounded corners — should be square

The destination hero image on the trip detail page has border-radius. It should be fully square (no rounded corners) for edge-to-edge feel.

### B18: Itinerary items above chat — should be below

On the trip detail page, the itinerary items section is above the chat. The chat should be the first thing users see, with itinerary below.

### B19: Tool progress items have no gap between them

The loading/tool progress indicators in the chat have no spacing between them.

### B20: Double confirm buttons on flight tile selection

After selecting a flight in the tile list, a "Confirm Selection" button appears on the card group, but additional confirm buttons also appear below. The card group's confirm button should be the only one.

### B21: Hotel tiles missing prices

Many hotel tiles don't display prices. All hotels should show price_per_night and total_price.

### B22: Over-budget value shows NaN

When total_spent exceeds budget_total, the remaining budget displays NaN instead of a negative number.

### B23: Explore page needs search bar

The explore page should have a text search bar that filters destination cards by name, in addition to the category filters.

### B14: Tile selections don't persist to trip record

When a user selects a flight/hotel/car/experience from the tile cards, the selection sends a chat message ("I've selected...") but nothing persists to `trip_flights`, `trip_hotels`, `trip_car_rentals`, or `trip_experiences`. The trip detail page shows "No itinerary items" and "$0 allocated" because the selection tables are empty. Need selection persistence tools or a mechanism for Claude to call `update_trip` with the selected item data after the user confirms.

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

Fixed: API proxied through Vercel rewrites (`/api/:path*` → Railway) for same-origin cookies. Changed `sameSite` to `'lax'`. Safari ITP no longer blocks the session cookie. Resolved 2026-04-03.
