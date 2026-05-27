# Complete Trip Experience Design

**Date:** 2026-05-27
**Status:** Approved
**Scope:** Multi-city support, interactive map, day-by-day itinerary, booking links, export/sharing, agent personality, foundation fixes, portfolio amplifiers

## Context

Voyager is a functional agentic AI travel planner with a complete single-destination planning loop. A "Tropical Editorial" visual redesign just shipped (Playfair Display + DM Sans, ocean/sand/lagoon/sunset palette, split layouts, category color-coding). This spec adds the features that make the trip experience feel complete and the product self-selling.

**Guiding constraints:**

- Mobile-first design for every feature
- Both portfolio-impressive AND genuinely useful
- Persona tied to user profile, not per-trip
- Builds on the existing Tropical Editorial design system

## Tier 0: Foundation Fixes

Ship before any new features. These are P1/P2 findings from the 2026-05-27 UX and marketing audits.

### Small fixes (1-2 hours each)

1. Add `role="alert"` to `Toast.tsx` root div (screen reader announcements)
2. Add `aria-pressed` to trip_type toggle buttons in TripDetailsForm
3. Add skip-to-main-content link (WCAG 2.4.1)
4. Fix destination pre-fill from explore page: `trips/new/page.tsx` must read `useSearchParams().get('destination')` and seed the trip (US-5)
5. Fix banned words in landing page copy: remove "hidden gems", "curated", "insider knowledge"
6. Fix Barcelona/Monterey mismatch: demo section header says Barcelona, MockChatBox shows Monterey
7. Add OG image (1200x630 PNG) and Twitter card metadata to root `layout.tsx`
8. Add `sitemap.ts` and `robots.ts` to Next.js App Router
9. Add concrete example prompt to chat empty state: clickable starter like "Plan a 5-day trip to Tokyo for 2 people, $4000 budget"
10. Remove em dashes from metadata titles (R-001 compliance)

### Medium fixes (half day each)

11. Migrate PreferencesWizard to Radix Dialog (focus trap, focus return)
12. Migrate BookingConfirmation to Radix Dialog (focus trap, focus return)
13. AuthGuard `?next=` redirect preservation: save intended destination through auth flow (US-12)
14. ChatBox mobile breakpoint: responsive height (50-60vh on mobile), stacked tiles instead of horizontal scroll
15. Consistent loading states: replace plain-text loading in trips list and trip detail with skeleton screens matching Tropical Editorial

## Tier 1: Core Features

### 1. Multi-City Trip Support

#### User experience

User types "Plan a trip: Tokyo for 4 days, then Kyoto for 3 days, $5000 budget." The agent recognizes multi-city intent, creates legs, and plans each city sequentially with inter-city transport.

#### Data model

**New table: `trip_legs`**

```
id              UUID PRIMARY KEY
trip_id         UUID REFERENCES trips(id) ON DELETE CASCADE
leg_order       INTEGER NOT NULL
origin          TEXT NOT NULL
destination     TEXT NOT NULL
departure_date  DATE NOT NULL
arrival_date    DATE NOT NULL
budget_allocation NUMERIC(10,2)
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

UNIQUE(trip_id, leg_order)
```

**New table: `trip_transport`**

```
id              UUID PRIMARY KEY
trip_id         UUID REFERENCES trips(id) ON DELETE CASCADE
from_leg_id     UUID REFERENCES trip_legs(id)
to_leg_id       UUID REFERENCES trip_legs(id)
mode            TEXT NOT NULL (train, bus, flight, ferry)
provider        TEXT
departure       TIMESTAMPTZ
arrival         TIMESTAMPTZ
price           NUMERIC(10,2)
booking_url     TEXT
raw_data        JSONB
selected        BOOLEAN DEFAULT FALSE
created_at      TIMESTAMPTZ DEFAULT NOW()
```

**Modified tables:**

- `trips`: add `trip_type` TEXT DEFAULT 'single' (values: 'single', 'multi_city')
- `trip_flights`, `trip_hotels`, `trip_experiences`, `trip_car_rentals`: add nullable `leg_id UUID REFERENCES trip_legs(id)`

For single-destination trips, `leg_id` is NULL and behavior is unchanged. Trip-level flights (home to first city, last city to home) have `leg_id` set to the first and last leg respectively.

#### Agent tools

**New tool: `search_transport`**

- Input: origin city, destination city, date, passengers
- Output: up to 5 options (trains, buses, domestic flights) sorted by duration
- External API: SerpApi Google Flights for domestic flights between cities. For trains/buses, v1 uses a curated lookup table of major routes (Shinkansen corridors, Eurostar, TGV, Amtrak NE Corridor, etc.) with price estimates and durations. The lookup table lives in `server/src/data/transport-routes.json` and is a runtime-loaded asset (build-smoke required per R-205). Future versions can integrate Rome2Rio API for comprehensive coverage
- Cache: same Redis/Postgres dual-cache as flights

**New tool: `add_leg`**

- Input: trip_id, destination, departure_date, arrival_date, budget_allocation (optional)
- Output: created leg with leg_order
- The agent calls this when it identifies a new city in the user's request

**New tool: `remove_leg`**

- Input: trip_id, leg_id
- Output: confirmation, cascading delete of associated items
- The agent calls this when the user says "skip Kyoto" or "remove that city"

**New tool: `reorder_legs`**

- Input: trip_id, ordered list of leg_ids
- Output: updated leg_orders
- The agent calls this when the user says "do Kyoto first, then Tokyo"

**Modified tool: `calculate_remaining_budget`**

- Add per-leg breakdown to output: `legs: [{ leg_id, destination, allocated, spent, remaining }]`
- Total budget still tracks overall trip

#### System prompt additions

When the user mentions multiple cities, the agent:

1. Calls `add_leg` for each city with proportional budget allocation (by days unless user specifies)
2. Searches flights to the first city and from the last city
3. Searches transport between consecutive legs
4. Searches hotels and experiences per leg
5. Calls `calculate_remaining_budget` after each selection to track per-leg and total budgets

#### Itinerary pane UI

Leg selector tabs appear below the map area:

- Horizontal tabs showing each city with its dates: "Tokyo (May 1-4)" | "Kyoto (May 5-8)"
- An "Overview" tab at the end shows the full trip timeline
- Selecting a leg filters the budget bar and item cards below
- Active tab styled with ocean underline (existing Tropical Editorial tab pattern)

On mobile: leg tabs become a horizontal scrollable pill bar.

### 2. Interactive Map Panel

#### Layout

Map embedded at the top of the itinerary pane (Option A from the mockup review). Height: 220px on desktop, 180px on mobile.

Map library: Mapbox GL JS (free tier: 50k loads/month, sufficient for portfolio).

#### Pin behavior

- Pins use category colors: ocean (flights/airports), sand (hotels), lagoon (experiences), sunset (car rentals/transport)
- Pin shape: rounded with category icon inside
- Hovering an itinerary item below highlights its corresponding pin (border glow + popup with name and price)
- Clicking a pin scrolls the itinerary list to that item
- When a specific day is expanded in timeline view, the map filters to show only that day's pins with route lines connecting them in chronological order

#### Leg switching

When the user switches legs in the tab selector, the map animates to the new city's bounds (Mapbox `fitBounds` with padding).

#### Mobile

Map appears above the itinerary items in the "Itinerary" tab. Same 180px height. Touch-friendly pins (minimum 44px tap target with invisible hit area expansion).

### 3. Day-by-Day Itinerary Builder

#### Auto-scheduling trigger

After the user has selected a flight + hotel + 2 or more experiences for a leg, the agent proactively calls `plan_daily_schedule` and presents a proposed timeline in the chat.

#### New tool: `plan_daily_schedule`

- Input: trip_id, leg_id
- Process: reads all selected items for the leg, queries Google Maps Distance Matrix API for travel times between locations, considers user's travel_pace preference, generates a day-by-day schedule
- Output: structured schedule with day groups, time slots, travel time indicators
- Cache: distance matrix results cached in `api_cache` table

#### New database table: `trip_schedule`

```
id              UUID PRIMARY KEY
trip_id         UUID REFERENCES trips(id) ON DELETE CASCADE
leg_id          UUID REFERENCES trip_legs(id)
day_number      INTEGER NOT NULL
day_date        DATE NOT NULL
day_theme       TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

**`trip_schedule_items`:**

```
id              UUID PRIMARY KEY
schedule_id     UUID REFERENCES trip_schedule(id) ON DELETE CASCADE
start_time      TIME
end_time        TIME
item_type       TEXT NOT NULL (flight, hotel_checkin, hotel_checkout, experience, transport, free_time)
reference_id    UUID (FK to the relevant trip_flights/hotels/experiences/transport row)
travel_from_previous_minutes INTEGER
notes           TEXT
sort_order      INTEGER NOT NULL
```

#### Itinerary pane view toggle

Below the leg tabs, a segmented control switches between:

- **Timeline** (default after schedule exists): items grouped by day, time-ordered
- **Category**: items grouped by type (current behavior)

Each day in timeline view:

- Collapsible section header: "Day 1 - May 1 - Arrival Day" (day number, date, agent-generated theme)
- Items listed with time, name, duration, and travel time indicator to next item
- Travel time shown as a subtle connector line between items with duration label

#### New chat node: `daily_schedule`

When the agent calls `plan_daily_schedule`, the chat renders a visual timeline node showing the proposed schedule. This node type:

- Shows each day as a compact timeline
- Items are color-coded by category
- The user can accept ("Looks great!") or request changes ("Move the temple to Day 3")

#### Mobile

Day headers are sticky within the scroll. Swipe left/right on the day header to navigate between days. Items stack vertically with generous touch targets.

### 4. Booking Deep Links

#### Link generation

Server-side URL builder generates booking platform links from `raw_data` JSONB:

- **Flights**: Google Flights URL with origin, destination, date, passengers, cabin class
- **Hotels**: Google Hotels or Booking.com URL with city, check-in, check-out, guests
- **Experiences**: Google Maps URL for the place (already have place_id from Google Places API)
- **Transport**: provider booking URL if available in SerpApi response, otherwise Google search

URL builder is a service module (`server/src/services/booking-links.ts`) that takes an item type and raw_data, returns a URL string. Returns null if insufficient data for a deep link.

#### UI placement

- Itinerary item cards: small "Book" icon-button on the right side, opens in new tab
- Booking confirmation modal: "Book" column in the itemized breakdown with links per item
- PDF export: URLs included as clickable text links
- Email share: booking links included per item

No affiliate tracking in v1. URL generation logic is isolated in the service module so affiliate parameters can be added later without touching UI code.

#### Mobile

"Book" buttons are 44px tap targets minimum. In the booking confirmation modal, each item row has a full-width "Book on Google Flights" button below the price.

### 5. PDF Export, Calendar Export, Email Sharing

#### PDF Export

**Library:** `@react-pdf/renderer` (client-side generation, no server dependency)

**Content:**

- Header: trip name, destinations, dates, travelers, total budget
- Per-leg section with city name and dates
- Day-by-day timeline with items, times, prices
- Booking links as clickable text URLs per item
- Per-day static map image (Mapbox Static Images API, 600x200px)
- Budget summary table at the end
- Footer: "Generated by Voyager" with generation date

**Styling:** Uses Tropical Editorial tokens (Playfair Display for headings, DM Sans for body, ocean/sand/lagoon/sunset for category colors).

**Button placement:** "Download PDF" in itinerary pane header toolbar.

#### Calendar Export (ICS)

**Library:** `ics` npm package (generates .ics files client-side)

**Events generated:**

- One event per flight (departure/arrival times, airline, flight number, terminal if available)
- Hotel check-in and check-out as separate events
- One event per experience (date, time, duration, location address)
- Transport events (departure time, route, provider)
- Travel time blocks between daily activities (if schedule exists)

Each event description includes the booking deep link.

**Button placement:** "Add to Calendar" in itinerary pane header toolbar, next to PDF.

#### Email Sharing

**Service:** Resend (transactional email, already in the portfolio stack)

**Endpoint:** `POST /trips/:id/share-email`

- Input: `{ recipientEmail: string, senderName: string, message?: string }`
- Server renders an HTML email template with:
  - Sender's message (if provided)
  - Trip summary (destinations, dates, budget)
  - Day-by-day highlights (first 2 items per day)
  - "View full itinerary" link (to the public shared trip URL, see Tier 2)
  - Booking links for the top 3 highest-value items
- Rate limited: 5 emails per trip per day

**Button placement:** "Share" in itinerary pane header toolbar. Opens a modal with email input, optional message, and send button.

#### Mobile

All three actions (PDF, Calendar, Share) live behind a single "Share" button that opens a bottom action sheet with the three options. Native share API (`navigator.share`) used where available for additional options.

### 6. Agent Personality

#### Persona matrix

The agent's tone and behavior adapt based on the user's `user_preferences` JSONB. Two dimensions drive the persona selection:

|               | Solo        | Couple      | Family      | Group       |
| ------------- | ----------- | ----------- | ----------- | ----------- |
| **Luxury**    | Expert      | Curated     | Refined     | Concierge   |
| **Mid-range** | Savvy       | Friendly    | Friendly    | Practical   |
| **Budget**    | Adventurous | Adventurous | Resourceful | Adventurous |

**Persona definitions:**

- **Expert**: Detailed trade-off analysis, premium recommendations, insider access tips, comparison reasoning ("I'm suggesting Gracery over the Park Hyatt because...")
- **Curated**: Romantic spots, fine dining pairings, boutique finds, experience-focused
- **Refined**: Family suites, private tours, seamless logistics, minimize friction
- **Concierge**: Group coordination, booking logistics, centralized recommendations
- **Savvy**: Best value picks, local favorites, smart trade-offs, price-conscious reasoning
- **Friendly**: Balanced recommendations, fun finds, practical tips, conversational tone
- **Practical**: Group-friendly venues, shared logistics, majority-pleasing picks
- **Adventurous**: Off-the-beaten-path, street food, local transit, backpacker wisdom, enthusiastic about discoveries
- **Resourceful**: Free activities, family-friendly budget options, public transport guides, picnic spots

#### Implementation

The persona is selected at the start of each chat turn when building the system prompt. The `buildSystemPrompt` function reads the user's preferences from the database and selects the matching persona template.

Persona templates are stored as markdown files in `server/src/prompts/personas/`:

```
server/src/prompts/personas/
  expert.md
  curated.md
  refined.md
  concierge.md
  savvy.md
  friendly.md
  practical.md
  adventurous.md
  resourceful.md
```

Each template defines: voice/tone instructions, types of recommendations to prioritize, level of detail in explanations, proactive suggestion triggers.

Fallback: if user has no preferences set, use "Friendly" persona.

The persona is stored/derived from the user's `user_preferences` table, not per-trip. It applies to all of that user's trips.

#### Proactive suggestions

The system prompt instructs the agent to synthesize available information proactively:

- After searching flights: note if nearby dates are significantly cheaper
- After selecting a hotel: suggest nearby dining/experiences
- When dates overlap with known events/festivals: mention them
- When arrival time is late: suggest airport-area first-night hotel
- When budget is tight: suggest trade-offs ("economy instead of premium saves $400 for 3 extra experiences")

These are prompt-driven behaviors, not new tools. The agent already has the data from existing tool calls.

#### Tool result summaries

When a tool completes, the server includes a `summary` field in the `tool_result` SSE event:

- Flights: "Found {total} flights {origin} to {dest}, showing the {count} best under ${maxPrice}"
- Hotels: "Found {total} hotels in {area}, showing {count} rated {minStars}+ stars"
- Experiences: "Found {total} {category} options near {location}, showing top {count} by rating"
- Transport: "Found {count} {mode} options, fastest is {duration}"

The `ChatProgressBar` widget renders this summary text when the tool's status changes to "complete", replacing the generic "Done" label.

## Tier 2: Portfolio Amplifiers

### 1. Anonymous Demo Mode

A "Try it now" button on the landing page drops visitors into a pre-authenticated demo session.

**Implementation:**

- Shared demo account in the database (seeded by migration)
- Demo session token issued on button click (no registration required)
- Session is time-limited (5 minutes of inactivity expires it)
- Demo trips are read-only after the session ends (cannot be modified by future demo users)
- A new demo trip is created for each anonymous session
- The demo account's preferences are pre-set to "Mid-range + Solo" (Savvy persona) for the most broadly appealing experience

**Constraints:**

- Demo sessions count against SerpApi quota. Rate limit: 3 demo sessions per IP per hour
- Demo trips are garbage-collected daily (cron job deletes demo trips older than 24 hours)

### 2. `/about` Page

Content sourced from the "honest pitch" section of DEMO-WALKTHROUGH.md. Uses the Tropical Editorial split layout.

**Left side:** Text content

- Who built it and why
- What it demonstrates (agentic tool-use, budget reasoning, real API integration)
- Tech stack summary
- Link to engineering audits

**Right side:**

- GitHub repo link (prominent)
- Screenshot or code snippet showing the agent loop
- Audit badge/count ("25 automated audits run")

### 3. Public Shareable Trip URLs

**New table: `shared_trips`**

```
id              UUID PRIMARY KEY
trip_id         UUID REFERENCES trips(id) ON DELETE CASCADE
share_token     TEXT UNIQUE NOT NULL
created_by      UUID REFERENCES users(id)
expires_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

**New route:** `/trips/shared/[token]`

- Public, no auth required
- Renders the trip detail page in read-only mode: itinerary pane with map, day-by-day timeline, budget summary, booking links
- No chat pane (the conversation is private)
- Share metadata: OG image generated from the trip data (destination image + trip summary text overlay)

**Share button:** In the itinerary pane toolbar. Clicking generates a token, creates the `shared_trips` row, and copies the URL to clipboard. Toast confirms "Link copied!"

**Expiry:** Share links expire after 30 days by default. The owner can regenerate.

## API Changes Summary

### New endpoints

| Method | Path                      | Purpose                        |
| ------ | ------------------------- | ------------------------------ |
| POST   | `/trips/:id/legs`         | Create a leg                   |
| DELETE | `/trips/:id/legs/:legId`  | Remove a leg                   |
| PUT    | `/trips/:id/legs/reorder` | Reorder legs                   |
| GET    | `/trips/:id/legs`         | List legs with items           |
| POST   | `/trips/:id/schedule`     | Generate/update daily schedule |
| GET    | `/trips/:id/schedule`     | Get daily schedule             |
| POST   | `/trips/:id/share-email`  | Send itinerary email           |
| POST   | `/trips/:id/share-link`   | Generate share token           |
| GET    | `/trips/shared/:token`    | Get shared trip (public)       |
| POST   | `/auth/demo`              | Create anonymous demo session  |

### Modified endpoints

| Method | Path              | Change                                           |
| ------ | ----------------- | ------------------------------------------------ |
| GET    | `/trips/:id`      | Include legs, schedule, share status in response |
| POST   | `/trips/:id/chat` | System prompt includes persona selection         |

## New Dependencies

| Package               | Purpose             | Tier   |
| --------------------- | ------------------- | ------ |
| `mapbox-gl`           | Interactive map     | Client |
| `@react-pdf/renderer` | PDF generation      | Client |
| `ics`                 | Calendar export     | Client |
| `resend`              | Transactional email | Server |

## Migration Plan

6 new database migrations in order:

1. Add `trip_type` column to `trips`
2. Create `trip_legs` table
3. Create `trip_transport` table
4. Add `leg_id` FK to item tables
5. Create `trip_schedule` and `trip_schedule_items` tables
6. Create `shared_trips` table

## Mobile-First Constraints

Every feature must work at 375px viewport width as the primary design target:

- Map: 180px height, 44px minimum pin tap targets
- Leg tabs: horizontal scrollable pill bar
- Day-by-day timeline: sticky day headers, swipe between days
- Booking links: full-width tap targets in confirmation modal
- Export/share: bottom action sheet pattern (PDF, Calendar, Email options)
- Chat input: `<textarea>` with auto-expand (max 4 lines)
- Tile cards: stack vertically instead of horizontal scroll
- Split view: collapses to tabbed (Chat | Itinerary) with tab bar below the banner

## Testing Strategy

- Multi-city: integration tests for leg CRUD endpoints, E2E for creating a multi-city trip via chat
- Map: component test for pin rendering, E2E for item-to-pin interaction
- Schedule: unit tests for `plan_daily_schedule` tool, E2E for auto-schedule trigger
- Booking links: unit test for URL builder per item type, E2E for link presence in confirmation modal
- Export: component test for PDF content, unit test for ICS event generation
- Email: integration test for share endpoint with mocked Resend
- Persona: unit test for persona selection from preferences, integration test for system prompt building
- Sharing: integration test for token generation and public trip fetch
- Demo: integration test for anonymous session creation and rate limiting
- Foundation fixes: one test per fix confirming the a11y or UX behavior
