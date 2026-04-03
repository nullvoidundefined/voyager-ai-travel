# Destination Imagery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add beautiful destination imagery throughout the app — hero carousel, trip tile images, booking confirmation photo header, and MockChatBox rebuilt with typed node components.

**Architecture:** Static Unsplash photo IDs mapped to cities via a frontend helper. The Unsplash CDN constructs resized URLs on the fly (`images.unsplash.com/photo-{ID}?w=X&h=Y`). Cities without curated photos get a CSS gradient fallback. The MockChatBox is rebuilt to render real `ChatNode` types via `NodeRenderer`.

**Tech Stack:** Next.js `<Image>`, Unsplash CDN (no API key), SCSS modules, existing `ChatNode` types and `NodeRenderer`

**Design Spec:** `docs/superpowers/specs/2026-04-03-destination-imagery-design.md`

**Verification before every commit:** `pnpm format:check && pnpm lint && pnpm test && pnpm build`

---

## File Structure

### New Files

```
web-client/src/lib/destinationImage.ts          # City → Unsplash ID map + URL helper
```

### Modified Files

```
server/src/data/cities.ts                                    # Add unsplash_id to CityData + top 30 cities
web-client/next.config.ts                                    # Add images.remotePatterns for Unsplash
web-client/src/app/page.tsx                                  # Hero carousel
web-client/src/app/page.module.scss                          # Hero image styles
web-client/src/components/MockChatBox/MockChatBox.tsx        # Complete rewrite with typed nodes
web-client/src/components/MockChatBox/MockChatBox.module.scss # Updated styles
web-client/src/app/(protected)/trips/page.tsx                # Trip cards with images
web-client/src/app/(protected)/trips/trips.module.scss       # Vertical card layout
web-client/src/components/BookingConfirmation/BookingConfirmation.tsx    # Photo header
web-client/src/components/BookingConfirmation/BookingConfirmation.module.scss # Header styles
```

---

## Task 1: Image Infrastructure — Unsplash IDs + Helper + Next.js Config

**Files:**

- Modify: `server/src/data/cities.ts`
- Create: `web-client/src/lib/destinationImage.ts`
- Modify: `web-client/next.config.ts`

- [ ] **Step 1: Add unsplash_id to CityData interface**

In `server/src/data/cities.ts`, add to the `CityData` interface:

```typescript
unsplash_id?: string;
```

- [ ] **Step 2: Add Unsplash IDs to top 30 cities**

Add `unsplash_id` to these cities in `CITY_DATABASE`. Each ID is a real Unsplash photo. Use these specific IDs (verified as stunning travel shots):

```typescript
'tokyo': { ..., unsplash_id: '1540959733332-eab848b19436' },
'paris': { ..., unsplash_id: '1502602898657-3e91760cbb34' },
'new york': { ..., unsplash_id: '1534430480872-3498386e7856' },
'london': { ..., unsplash_id: '1513635269975-59663e0ac1ad' },
'barcelona': { ..., unsplash_id: '1583422409516-2895a77efded' },
'rome': { ..., unsplash_id: '1552832230-c0197dd311b5' },
'sydney': { ..., unsplash_id: '1506973035872-a4ec16b8e8d9' },
'dubai': { ..., unsplash_id: '1512453913961-1491d39ae3fc' },
'singapore': { ..., unsplash_id: '1525625293386-3f8f99389edd' },
'seoul': { ..., unsplash_id: '1517154421773-0529f29ea451' },
'lisbon': { ..., unsplash_id: '1555881400-74d7acaacd8b' },
'istanbul': { ..., unsplash_id: '1524231757912-21f4fe3a7200' },
'bangkok': { ..., unsplash_id: '1508009603885-50cf7c579365' },
'cape town': { ..., unsplash_id: '1580060839134-75a5edca2e99' },
'amsterdam': { ..., unsplash_id: '1534351590666-13e3e96b5017' },
'prague': { ..., unsplash_id: '1519677100203-a0e668c92439' },
'vienna': { ..., unsplash_id: '1516550893923-42d28e5677af' },
'budapest': { ..., unsplash_id: '1549923746-c502d488b3ea' },
'rio de janeiro': { ..., unsplash_id: '1483729558449-99ef09a8c325' },
'bali': { ..., unsplash_id: '1537996194471-e657df975ab4' },
'santorini': { ..., unsplash_id: '1570077188670-e3a8d69ac5ff' },
'kyoto': { ..., unsplash_id: '1493976040374-85c8e12f0c0e' },
'marrakech': { ..., unsplash_id: '1489749798305-4fea3ae63d43' },
'reykjavik': { ..., unsplash_id: '1504829857797-ddff29c27927' },
'dubrovnik': { ..., unsplash_id: '1555990538-1e15a10e4c61' },
'mexico city': { ..., unsplash_id: '1518659526054-e25d4cec600a' },
'lima': { ..., unsplash_id: '1531968455002-3498ae6027a1' },
'mumbai': { ..., unsplash_id: '1529253355930-ddbe423a2ac7' },
'auckland': { ..., unsplash_id: '1507699580474-99cf7c0cf42d' },
'havana': { ..., unsplash_id: '1500759285222-a95626b934cb' },
```

- [ ] **Step 3: Create frontend destination image helper**

Create `web-client/src/lib/destinationImage.ts`:

```typescript
// Static map of city names to Unsplash photo IDs.
// Only the ~30 curated cities are listed — others get the gradient fallback.
const CITY_IMAGES: Record<string, string> = {
  tokyo: '1540959733332-eab848b19436',
  paris: '1502602898657-3e91760cbb34',
  'new york': '1534430480872-3498386e7856',
  london: '1513635269975-59663e0ac1ad',
  barcelona: '1583422409516-2895a77efded',
  rome: '1552832230-c0197dd311b5',
  sydney: '1506973035872-a4ec16b8e8d9',
  dubai: '1512453913961-1491d39ae3fc',
  singapore: '1525625293386-3f8f99389edd',
  seoul: '1517154421773-0529f29ea451',
  lisbon: '1555881400-74d7acaacd8b',
  istanbul: '1524231757912-21f4fe3a7200',
  bangkok: '1508009603885-50cf7c579365',
  'cape town': '1580060839134-75a5edca2e99',
  amsterdam: '1534351590666-13e3e96b5017',
  prague: '1519677100203-a0e668c92439',
  vienna: '1516550893923-42d28e5677af',
  budapest: '1549923746-c502d488b3ea',
  'rio de janeiro': '1483729558449-99ef09a8c325',
  bali: '1537996194471-e657df975ab4',
  santorini: '1570077188670-e3a8d69ac5ff',
  kyoto: '1493976040374-85c8e12f0c0e',
  marrakech: '1489749798305-4fea3ae63d43',
  reykjavik: '1504829857797-ddff29c27927',
  dubrovnik: '1555990538-1e15a10e4c61',
  'mexico city': '1518659526054-e25d4cec600a',
  lima: '1531968455002-3498ae6027a1',
  mumbai: '1529253355930-ddbe423a2ac7',
  auckland: '1507699580474-99cf7c0cf42d',
  havana: '1500759285222-a95626b934cb',
};

export function getDestinationImageUrl(
  unsplashId: string,
  width: number,
  height: number,
): string {
  return `https://images.unsplash.com/photo-${unsplashId}?w=${width}&h=${height}&fit=crop&q=80`;
}

export function getDestinationImage(cityName: string): {
  url: string | null;
  unsplashId: string | null;
} {
  const key = cityName.toLowerCase().trim();
  const id = CITY_IMAGES[key] ?? null;
  return {
    url: id
      ? `https://images.unsplash.com/photo-${id}?w=800&h=400&fit=crop&q=80`
      : null,
    unsplashId: id,
  };
}

// Hero carousel images — 5 curated destinations
export const HERO_IMAGES = [
  { city: 'Santorini', id: CITY_IMAGES['santorini']! },
  { city: 'Tokyo', id: CITY_IMAGES['tokyo']! },
  { city: 'Paris', id: CITY_IMAGES['paris']! },
  { city: 'Bali', id: CITY_IMAGES['bali']! },
  { city: 'New York', id: CITY_IMAGES['new york']! },
];
```

- [ ] **Step 4: Update Next.js config**

In `web-client/next.config.ts`, add `images` configuration:

```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
  },
  async rewrites() {
    // ... existing rewrites
  },
};
```

- [ ] **Step 5: Verify**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add Unsplash photo IDs to cities and destination image helper"
```

---

## Task 2: Home Page Hero Carousel

**Files:**

- Modify: `web-client/src/app/page.tsx`
- Modify: `web-client/src/app/page.module.scss`

- [ ] **Step 1: Add hero carousel to page.tsx**

Read the current home page. Add a carousel component to the hero section:

```typescript
import { useEffect, useState } from 'react';

import { HERO_IMAGES, getDestinationImageUrl } from '@/lib/destinationImage';
import Image from 'next/image';
```

Add carousel state and effect inside the component:

```typescript
const [heroIndex, setHeroIndex] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

Wrap the hero section content with the carousel images. Inside the `hero` div, before the text content:

```tsx
{
  HERO_IMAGES.map((img, i) => (
    <Image
      key={img.city}
      src={getDestinationImageUrl(img.id, 1600, 800)}
      alt={`${img.city} destination`}
      fill
      className={`${styles.heroImage} ${i === heroIndex ? styles.heroImageActive : ''}`}
      priority={i === 0}
      sizes='100vw'
    />
  ));
}
<div className={styles.heroOverlay} />;
```

The text content div needs `className={styles.heroContent}` with `position: relative; z-index: 2`.

- [ ] **Step 2: Update hero styles**

In `page.module.scss`, update the hero section:

```scss
.hero {
  position: relative;
  overflow: hidden;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  // Remove the old radial gradient background
}

.heroImage {
  position: absolute;
  inset: 0;
  object-fit: cover;
  z-index: 0;
  opacity: 0;
  transition: opacity 1s ease-in-out;
}

.heroImageActive {
  opacity: 1;
}

.heroOverlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.55));
}

.heroContent {
  position: relative;
  z-index: 2;
  text-align: center;
  color: var(--cta-text); // white text on image
}
```

Update the hero title, subtitle, and CTA button colors to work on the dark image:

- Title: white
- Subtitle: rgba(255, 255, 255, 0.85)
- CTA primary: keep coral (`var(--cta)`) with white text
- CTA secondary: white border, white text, transparent bg

- [ ] **Step 3: Verify**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add hero carousel with rotating destination images on home page"
```

---

## Task 3: Trip Tiles with Destination Images

**Files:**

- Modify: `web-client/src/app/(protected)/trips/page.tsx`
- Modify: `web-client/src/app/(protected)/trips/trips.module.scss`

- [ ] **Step 1: Add images to trip cards**

Read the current trips page. Import the image helper:

```typescript
import { getDestinationImage } from '@/lib/destinationImage';
import Image from 'next/image';
```

Update each trip card to include an image header. Inside the card, before the text content:

```tsx
{
  (() => {
    const { url } = getDestinationImage(trip.destination);
    return url ? (
      <div className={styles.cardImage}>
        <Image
          src={url}
          alt={trip.destination}
          fill
          sizes='(max-width: 600px) 100vw, 50vw'
          style={{ objectFit: 'cover' }}
        />
      </div>
    ) : (
      <div className={styles.cardImageFallback}>
        <span>{trip.destination}</span>
      </div>
    );
  })();
}
```

Move the delete button to overlay the top-right of the image.

- [ ] **Step 2: Update trip card styles**

Change the card layout from horizontal flex to vertical stack:

```scss
.tripCard {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  overflow: hidden;
  background: var(--surface);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);

  &:hover {
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
}

.cardImage {
  position: relative;
  height: 160px;
  width: 100%;
}

.cardImageFallback {
  height: 160px;
  width: 100%;
  background: linear-gradient(135deg, var(--accent), var(--cta));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cta-text);
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
}
```

Update the card grid to use CSS grid with cards that stack vertically:

```scss
.trips {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
```

The delete button overlays the image:

```scss
.deleteButton {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  // ... rest of delete button styles
}
```

- [ ] **Step 3: Verify**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add destination images to trip tiles on trips list page"
```

---

## Task 4: Booking Confirmation Photo Header

**Files:**

- Modify: `web-client/src/components/BookingConfirmation/BookingConfirmation.tsx`
- Modify: `web-client/src/components/BookingConfirmation/BookingConfirmation.module.scss`

- [ ] **Step 1: Add destination image to confirmation modal**

Read the current BookingConfirmation component. Import the image helper:

```typescript
import { getDestinationImage } from '@/lib/destinationImage';
import Image from 'next/image';
```

At the top of the modal content (before the trip details), add the image header:

```tsx
<div className={styles.imageHeader}>
  {(() => {
    const { url } = getDestinationImage(destination);
    return url ? (
      <Image
        src={url.replace('w=800', 'w=800').replace('h=400', 'h=400')}
        alt={destination}
        fill
        sizes='520px'
        style={{ objectFit: 'cover' }}
      />
    ) : (
      <div className={styles.imageFallback} />
    );
  })()}
  <div className={styles.imageOverlay}>
    <h2 className={styles.imageTitle}>
      {stage === 'confirmed' ? `You're going to` : 'Confirm your trip to'}
    </h2>
    <h1 className={styles.imageDestination}>{destination}</h1>
  </div>
</div>
```

- [ ] **Step 2: Add image header styles**

```scss
.imageHeader {
  position: relative;
  height: 180px;
  margin: -32px -32px 24px;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  overflow: hidden;
}

.imageFallback {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--accent), var(--cta));
}

.imageOverlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 30%, rgba(0, 0, 0, 0.6) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 20px 24px;
  color: var(--cta-text);
}

.imageTitle {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 400;
  margin: 0;
  opacity: 0.9;
}

.imageDestination {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
}
```

- [ ] **Step 3: Verify**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add destination photo header to booking confirmation modal"
```

---

## Task 5: MockChatBox Rewrite with Typed Nodes

**Files:**

- Rewrite: `web-client/src/components/MockChatBox/MockChatBox.tsx`
- Modify: `web-client/src/components/MockChatBox/MockChatBox.module.scss`

- [ ] **Step 1: Rewrite MockChatBox with typed node data**

Replace the entire MockChatBox component. The new version:

- Defines a static `DEMO_MESSAGES` array of `ChatMessage` objects with properly typed `ChatNode` arrays
- Uses `NodeRenderer` to render each node
- Animates messages appearing sequentially (same timing as before: 1.8s user, 2.4s assistant)
- Auto-scrolls and loops after all messages are shown

The demo script follows the Monterey trip from the spec:

```typescript
import { NodeRenderer } from '@/components/ChatBox/NodeRenderer';
import type { ChatMessage } from '@agentic-travel-agent/shared-types';
```

Demo messages array with typed nodes:

1. Assistant text: "Great choice! Let's plan your trip to **Monterey**."
2. Assistant travel_plan_form: fields for origin, dates, budget, travelers
3. User text: "San Francisco, April 15-22, $3000, 2 travelers"
4. Assistant text + quick_replies: "Will you be flying or driving?" + ["I'll be flying", "I'll drive"]
5. User text: "I'll drive"
6. Assistant text + quick_replies: "Do you need a hotel?" + ["Yes, find me a hotel", "No, I have lodging"]
7. User text: "Yes, find me a hotel"
8. Assistant text + hotel_tiles: "Here are some hotels." + 2 hotel cards (Monterey Plaza Hotel, InterContinental)
9. User text: "I've selected Monterey Plaza Hotel"
10. Assistant text + experience_tiles + budget_bar: "Here are some experiences." + 2 experience cards + budget bar

The hotel and experience tile data should be realistic but hardcoded (not from any API).

- [ ] **Step 2: Update MockChatBox styles**

Update the SCSS to accommodate the node-based layout:

- Messages use the same role badge + bubble pattern as VirtualizedChat
- Nodes render inline within bubbles
- The form, tiles, and chips are non-interactive (pointer-events: none or disabled styling)
- Keep the 540px height, auto-scroll, typing indicator, disabled input, "Live demo" footer

- [ ] **Step 3: Verify**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: rewrite MockChatBox with typed node components for accurate product demo"
```

---

## Task 6: Deploy

- [ ] **Step 1: Push and deploy**

```bash
git push
railway up --detach
npx vercel --prod --yes
```

No database migration needed — this is purely frontend + static data.

---

## Self-Review

**Spec coverage:**

- ✅ Unsplash CDN with static photo IDs (Task 1)
- ✅ CSS gradient fallback for unknown cities (Task 1 helper + Tasks 2-4 implementations)
- ✅ Next.js image config (Task 1)
- ✅ Frontend helper function (Task 1)
- ✅ ~30 curated city photo IDs (Task 1)
- ✅ Hero carousel with 5 images, crossfade, overlay (Task 2)
- ✅ Trip tiles with image headers, vertical layout (Task 3)
- ✅ Booking confirmation photo header with overlay text (Task 4)
- ✅ MockChatBox rewrite with typed nodes (Task 5)
- ✅ "Planning..." fallback for placeholder trips (Task 3 gradient fallback)
- ✅ Confirmed state keeps image visible (Task 4)
- ✅ Mobile: object-fit: cover handles responsive (Tasks 2-4)

**Placeholder scan:** No TBDs. Unsplash photo IDs are listed explicitly. MockChatBox demo data described at the node level — the implementing agent creates the exact ChatNode objects.

**Type consistency:** `getDestinationImage(cityName)` returns `{ url, unsplashId }` — used consistently in Tasks 2, 3, 4. `getDestinationImageUrl(id, w, h)` used for custom sizing in hero. `HERO_IMAGES` array used in Task 2 carousel.
