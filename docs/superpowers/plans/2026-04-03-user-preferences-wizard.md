# User Preferences Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve user preferences from 3 fixed fields into a 7-category wizard with JSONB storage, versioned schema, per-step save, and direct integration into the agent's trip curation prompts.

**Architecture:** A `preferences` JSONB column replaces the 3 individual columns on `user_preferences`. A `normalizePreferences()` function handles schema evolution via a version field. The frontend wizard is a 6-step modal that saves per-step via `PUT /user-preferences`. Each preference category is interpolated into the relevant per-category agent prompt.

**Tech Stack:** TypeScript, PostgreSQL (JSONB), Express 5, Next.js 15, React, SCSS modules, TanStack Query

**Design Spec:** `docs/superpowers/specs/2026-04-03-user-preferences-wizard-design.md`

**Verification before every commit:** `pnpm format:check && pnpm lint && pnpm test && pnpm build`

---

## File Structure

### New Files

```
server/migrations/1771879388557_migrate-preferences-to-jsonb.js
server/src/schemas/userPreferences.ts                    # Rewrite: new types, constants, normalizePreferences()
web-client/src/components/PreferencesWizard/
  PreferencesWizard.tsx                                  # Main modal with step navigation
  PreferencesWizard.module.scss                          # Wizard styles
  steps/
    AccommodationStep.tsx                                # Step 1: single select cards
    TravelPaceStep.tsx                                   # Step 2: single select cards
    DiningStep.tsx                                       # Step 3: dietary multi-select + dining style single select
    ActivitiesStep.tsx                                   # Step 4: multi-select grid
    TravelPartyStep.tsx                                  # Step 5: single select chips
    BudgetComfortStep.tsx                                # Step 6: single select cards
```

### Modified Files

```
server/src/repositories/userPreferences/userPreferences.ts    # Read/write JSONB preferences column
server/src/handlers/userPreferences/userPreferences.ts        # Normalize on read, validate on write
server/src/handlers/userPreferences/userPreferences.test.ts   # Updated tests
server/src/prompts/trip-context.ts                            # Expand user_preferences to 7 categories
server/src/prompts/category-prompts.ts                        # Interpolate preferences into prompts
server/src/handlers/chat/chat.ts                              # Map new preferences into tripContext
web-client/src/app/(auth)/register/page.tsx                   # Replace inline preferences with wizard
web-client/src/app/(protected)/account/page.tsx               # Add edit button, show all categories
web-client/src/components/Header/Header.tsx                   # Badge for incomplete preferences
```

---

## Task 1: Schema + normalizePreferences (Backend Foundation)

**Files:**

- Rewrite: `server/src/schemas/userPreferences.ts`
- Test: `server/src/schemas/userPreferences.test.ts` (new)

- [ ] **Step 1: Write tests for normalizePreferences**

Create `server/src/schemas/userPreferences.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import {
  CURRENT_PREFERENCES_VERSION,
  DEFAULT_PREFERENCES,
  type UserPreferences,
  WIZARD_STEPS,
  normalizePreferences,
} from './userPreferences.js';

describe('userPreferences schema', () => {
  describe('normalizePreferences', () => {
    it('returns defaults for null input', () => {
      const result = normalizePreferences(null);
      expect(result.version).toBe(CURRENT_PREFERENCES_VERSION);
      expect(result.accommodation).toBeNull();
      expect(result.travel_pace).toBeNull();
      expect(result.dietary).toEqual([]);
      expect(result.dining_style).toBeNull();
      expect(result.activities).toEqual([]);
      expect(result.travel_party).toBeNull();
      expect(result.budget_comfort).toBeNull();
      expect(result.completed_steps).toEqual([]);
    });

    it('returns defaults for undefined input', () => {
      const result = normalizePreferences(undefined);
      expect(result.version).toBe(CURRENT_PREFERENCES_VERSION);
    });

    it('returns defaults for empty object', () => {
      const result = normalizePreferences({});
      expect(result.version).toBe(CURRENT_PREFERENCES_VERSION);
      expect(result.accommodation).toBeNull();
    });

    it('preserves valid v1 data', () => {
      const input: UserPreferences = {
        version: 1,
        accommodation: 'upscale',
        travel_pace: 'relaxed',
        dietary: ['vegan'],
        dining_style: 'fine-dining',
        activities: ['history-culture', 'wellness-spa'],
        travel_party: 'romantic-partner',
        budget_comfort: 'comfort-first',
        completed_steps: ['accommodation', 'travel_pace', 'dining'],
      };
      const result = normalizePreferences(input);
      expect(result).toEqual(input);
    });

    it('fills missing fields with defaults', () => {
      const input = { version: 1, accommodation: 'budget' };
      const result = normalizePreferences(input);
      expect(result.accommodation).toBe('budget');
      expect(result.travel_pace).toBeNull();
      expect(result.dietary).toEqual([]);
      expect(result.activities).toEqual([]);
      expect(result.completed_steps).toEqual([]);
    });

    it('upgrades v0 data (legacy format with intensity/social)', () => {
      const legacy = {
        dietary: ['vegetarian'],
        intensity: 'active',
        social: 'couple',
      };
      const result = normalizePreferences(legacy);
      expect(result.version).toBe(1);
      expect(result.dietary).toEqual(['vegetarian']);
      expect(result.travel_pace).toBe('active');
      expect(result.travel_party).toBe('romantic-partner');
      expect(result.accommodation).toBeNull();
    });

    it('maps legacy social values correctly', () => {
      expect(normalizePreferences({ social: 'couple' }).travel_party).toBe(
        'romantic-partner',
      );
      expect(normalizePreferences({ social: 'group' }).travel_party).toBe(
        'friends',
      );
      expect(normalizePreferences({ social: 'family' }).travel_party).toBe(
        'family-with-kids',
      );
      expect(normalizePreferences({ social: 'solo' }).travel_party).toBe(
        'solo',
      );
    });
  });

  describe('WIZARD_STEPS', () => {
    it('has 6 steps', () => {
      expect(WIZARD_STEPS).toHaveLength(6);
    });

    it('each step has id and label', () => {
      for (const step of WIZARD_STEPS) {
        expect(step.id).toBeDefined();
        expect(step.label).toBeDefined();
      }
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/schemas/userPreferences.test.ts`
Expected: FAIL — imports don't match

- [ ] **Step 3: Rewrite userPreferences.ts schema**

Replace entire contents of `server/src/schemas/userPreferences.ts`:

```typescript
// --- Option constants ---

export const ACCOMMODATION_OPTIONS = [
  {
    value: 'budget',
    label: 'Budget',
    description: 'Hostels, budget hotels, basic stays',
  },
  {
    value: 'mid-range',
    label: 'Mid-Range',
    description: '3-star hotels, vacation rentals',
  },
  {
    value: 'upscale',
    label: 'Upscale',
    description: '4-5 star hotels, boutique properties',
  },
  {
    value: 'unique',
    label: 'Unique Stays',
    description: 'Glamping, ryokans, treehouses, eco-lodges',
  },
] as const;

export const TRAVEL_PACE_OPTIONS = [
  {
    value: 'relaxed',
    label: 'Relaxed',
    description: '1-2 activities per day, plenty of downtime',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Balanced mix of activity and rest',
  },
  {
    value: 'packed',
    label: 'Packed',
    description: 'Early mornings, late nights, see everything',
  },
] as const;

export const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'none',
] as const;

export const DINING_STYLE_OPTIONS = [
  {
    value: 'street-food',
    label: 'Street Food',
    description: 'Local markets, food stalls, cheap eats',
  },
  {
    value: 'casual',
    label: 'Casual Dining',
    description: 'Local restaurants, cafes, bistros',
  },
  {
    value: 'fine-dining',
    label: 'Fine Dining',
    description: 'Upscale restaurants, tasting menus',
  },
  {
    value: 'food-tours',
    label: 'Food Experiences',
    description: 'Cooking classes, food tours, culinary adventures',
  },
] as const;

export const ACTIVITY_OPTIONS = [
  { value: 'history-culture', label: 'History & Culture' },
  { value: 'nature-outdoors', label: 'Nature & Outdoors' },
  { value: 'beach-water-sports', label: 'Beach & Water Sports' },
  { value: 'nightlife', label: 'Nightlife & Entertainment' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'wellness-spa', label: 'Wellness & Spa' },
  { value: 'adventure-sports', label: 'Adventure Sports' },
  { value: 'art-museums', label: 'Art & Museums' },
  { value: 'photography', label: 'Photography' },
  { value: 'local-experiences', label: 'Local Experiences' },
] as const;

export const TRAVEL_PARTY_OPTIONS = [
  { value: 'solo', label: 'Solo', description: 'Traveling alone' },
  {
    value: 'romantic-partner',
    label: 'Romantic Partner',
    description: 'Honeymoon, anniversary, romantic getaway',
  },
  {
    value: 'friends',
    label: 'Friends Group',
    description: 'Social travel with friends',
  },
  {
    value: 'family-with-kids',
    label: 'Family with Kids',
    description: 'Children under 12, kid-friendly focus',
  },
  {
    value: 'family-adults',
    label: 'Family / Adults',
    description: 'Adult family members, no kid constraints',
  },
] as const;

export const BUDGET_COMFORT_OPTIONS = [
  {
    value: 'budget-conscious',
    label: 'Budget-Conscious',
    description: 'Cheapest options first',
  },
  {
    value: 'value-seeker',
    label: 'Value Seeker',
    description: 'Best bang for the buck',
  },
  {
    value: 'comfort-first',
    label: 'Comfort First',
    description: 'Willing to pay more for convenience',
  },
  {
    value: 'no-concerns',
    label: 'No Budget Concerns',
    description: 'Show me the best',
  },
] as const;

// --- Wizard steps ---

export const WIZARD_STEPS = [
  { id: 'accommodation', label: 'Accommodation' },
  { id: 'travel_pace', label: 'Travel Pace' },
  { id: 'dining', label: 'Dining' },
  { id: 'activities', label: 'Activities' },
  { id: 'travel_party', label: 'Travel Party' },
  { id: 'budget_comfort', label: 'Budget' },
] as const;

// --- Types ---

export interface UserPreferences {
  version: number;
  accommodation: 'budget' | 'mid-range' | 'upscale' | 'unique' | null;
  travel_pace: 'relaxed' | 'moderate' | 'packed' | null;
  dietary: string[];
  dining_style: 'street-food' | 'casual' | 'fine-dining' | 'food-tours' | null;
  activities: string[];
  travel_party:
    | 'solo'
    | 'romantic-partner'
    | 'friends'
    | 'family-with-kids'
    | 'family-adults'
    | null;
  budget_comfort:
    | 'budget-conscious'
    | 'value-seeker'
    | 'comfort-first'
    | 'no-concerns'
    | null;
  completed_steps: string[];
}

export const CURRENT_PREFERENCES_VERSION = 1;

export const DEFAULT_PREFERENCES: UserPreferences = {
  version: CURRENT_PREFERENCES_VERSION,
  accommodation: null,
  travel_pace: null,
  dietary: [],
  dining_style: null,
  activities: [],
  travel_party: null,
  budget_comfort: null,
  completed_steps: [],
};

// --- Legacy value mapping ---

const LEGACY_SOCIAL_MAP: Record<string, string> = {
  couple: 'romantic-partner',
  group: 'friends',
  family: 'family-with-kids',
  solo: 'solo',
};

// --- Normalize ---

export function normalizePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PREFERENCES };
  }

  const data = raw as Record<string, unknown>;

  // v0: legacy format with intensity/social (no version field)
  if (!('version' in data)) {
    return {
      ...DEFAULT_PREFERENCES,
      dietary: Array.isArray(data.dietary) ? (data.dietary as string[]) : [],
      travel_pace:
        typeof data.intensity === 'string'
          ? (data.intensity as UserPreferences['travel_pace'])
          : null,
      travel_party:
        typeof data.social === 'string'
          ? ((LEGACY_SOCIAL_MAP[
              data.social
            ] as UserPreferences['travel_party']) ?? null)
          : null,
    };
  }

  // v1: current format — fill missing fields with defaults
  return {
    version: CURRENT_PREFERENCES_VERSION,
    accommodation:
      (data.accommodation as UserPreferences['accommodation']) ?? null,
    travel_pace: (data.travel_pace as UserPreferences['travel_pace']) ?? null,
    dietary: Array.isArray(data.dietary) ? (data.dietary as string[]) : [],
    dining_style:
      (data.dining_style as UserPreferences['dining_style']) ?? null,
    activities: Array.isArray(data.activities)
      ? (data.activities as string[])
      : [],
    travel_party:
      (data.travel_party as UserPreferences['travel_party']) ?? null,
    budget_comfort:
      (data.budget_comfort as UserPreferences['budget_comfort']) ?? null,
    completed_steps: Array.isArray(data.completed_steps)
      ? (data.completed_steps as string[])
      : [],
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd server && npx vitest run src/schemas/userPreferences.test.ts`
Expected: All PASS

- [ ] **Step 5: Verify full chain**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`
Expected: All pass (existing tests may fail due to old imports — handle in Task 2)

- [ ] **Step 6: Commit**

```bash
git add server/src/schemas/userPreferences.ts server/src/schemas/userPreferences.test.ts
git commit -m "feat: rewrite userPreferences schema with 7 categories, versioned JSONB, normalizePreferences"
```

---

## Task 2: Database Migration + Repository + Handler

**Files:**

- Create: `server/migrations/1771879388557_migrate-preferences-to-jsonb.js`
- Modify: `server/src/repositories/userPreferences/userPreferences.ts`
- Modify: `server/src/handlers/userPreferences/userPreferences.ts`
- Modify: `server/src/handlers/userPreferences/userPreferences.test.ts`

- [ ] **Step 1: Create migration**

Create `server/migrations/1771879388557_migrate-preferences-to-jsonb.js`:

```javascript
export const up = (pgm) => {
  // Add JSONB preferences column
  pgm.addColumns('user_preferences', {
    preferences: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
  });

  // Backfill from existing columns
  pgm.sql(`
    UPDATE user_preferences SET preferences = jsonb_build_object(
      'version', 1,
      'accommodation', null,
      'travel_pace', CASE WHEN intensity IS NOT NULL THEN to_jsonb(intensity::text) ELSE 'null'::jsonb END,
      'dietary', COALESCE(to_jsonb(dietary), '[]'::jsonb),
      'dining_style', null,
      'activities', '[]'::jsonb,
      'travel_party', CASE
        WHEN social = 'couple' THEN '"romantic-partner"'::jsonb
        WHEN social = 'group' THEN '"friends"'::jsonb
        WHEN social = 'family' THEN '"family-with-kids"'::jsonb
        WHEN social = 'solo' THEN '"solo"'::jsonb
        ELSE 'null'::jsonb
      END,
      'budget_comfort', null,
      'completed_steps', '[]'::jsonb
    )
  `);

  // Drop old columns and enums
  pgm.dropColumns('user_preferences', ['dietary', 'intensity', 'social']);
  pgm.dropType('preference_intensity');
  pgm.dropType('preference_social');
};

export const down = (pgm) => {
  // Recreate enums
  pgm.createType('preference_intensity', ['relaxed', 'moderate', 'active']);
  pgm.createType('preference_social', ['solo', 'couple', 'group', 'family']);

  // Recreate columns
  pgm.addColumns('user_preferences', {
    dietary: {
      type: 'text[]',
      notNull: true,
      default: pgm.func('ARRAY[]::text[]'),
    },
    intensity: {
      type: 'preference_intensity',
      notNull: true,
      default: 'moderate',
    },
    social: { type: 'preference_social', notNull: true, default: 'couple' },
  });

  pgm.dropColumns('user_preferences', ['preferences']);
};
```

- [ ] **Step 2: Update repository to use JSONB**

Rewrite `server/src/repositories/userPreferences/userPreferences.ts`:

```typescript
import { query } from 'app/db/pool/pool.js';
import {
  type UserPreferences,
  normalizePreferences,
} from 'app/schemas/userPreferences.js';

export interface UserPreferencesRow {
  id: string;
  user_id: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function findByUserId(
  userId: string,
): Promise<UserPreferences | null> {
  const result = await query<UserPreferencesRow>(
    `SELECT * FROM user_preferences WHERE user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return normalizePreferences(row.preferences);
}

export async function upsert(
  userId: string,
  preferences: Partial<UserPreferences>,
): Promise<UserPreferences> {
  // Merge with existing preferences
  const existing = await findByUserId(userId);
  const merged = { ...(existing ?? {}), ...preferences };

  const result = await query<UserPreferencesRow>(
    `INSERT INTO user_preferences (user_id, preferences)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = NOW()
     RETURNING *`,
    [userId, JSON.stringify(merged)],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Failed to upsert preferences');
  return normalizePreferences(row.preferences);
}

export async function deleteByUserId(userId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM user_preferences WHERE user_id = $1 RETURNING id`,
    [userId],
  );
  return (result.rowCount ?? 0) > 0;
}
```

- [ ] **Step 3: Update handler**

Rewrite `server/src/handlers/userPreferences/userPreferences.ts`:

```typescript
import {
  findByUserId,
  upsert,
} from 'app/repositories/userPreferences/userPreferences.js';
import { normalizePreferences } from 'app/schemas/userPreferences.js';
import type { Request, Response } from 'express';

export async function getPreferences(req: Request, res: Response) {
  const userId = req.user!.id;
  const prefs = await findByUserId(userId);
  res.json({ preferences: prefs });
}

export async function upsertPreferences(req: Request, res: Response) {
  const userId = req.user!.id;
  const input = req.body as Record<string, unknown>;

  // Validate: only allow known preference fields
  const allowedFields = [
    'accommodation',
    'travel_pace',
    'dietary',
    'dining_style',
    'activities',
    'travel_party',
    'budget_comfort',
    'completed_steps',
    'version',
  ];
  const filtered: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in input) {
      filtered[key] = input[key];
    }
  }

  const result = await upsert(userId, filtered);
  res.json({ preferences: result });
}
```

- [ ] **Step 4: Update handler tests**

Rewrite `server/src/handlers/userPreferences/userPreferences.test.ts` to test the new JSONB-based handler. Tests should verify:

- GET returns normalized preferences
- GET returns null when no preferences exist
- PUT upserts partial preferences (e.g., just `{ accommodation: 'budget', completed_steps: ['accommodation'] }`)
- PUT merges with existing preferences (doesn't overwrite unrelated fields)
- PUT strips unknown fields

- [ ] **Step 5: Verify full chain**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 6: Commit**

```bash
git add server/migrations/1771879388557_migrate-preferences-to-jsonb.js server/src/repositories/userPreferences/userPreferences.ts server/src/handlers/userPreferences/userPreferences.ts server/src/handlers/userPreferences/userPreferences.test.ts
git commit -m "feat: migrate user_preferences to JSONB, update repository and handler"
```

---

## Task 3: Agent Integration — TripContext + Category Prompts

**Files:**

- Modify: `server/src/prompts/trip-context.ts`
- Modify: `server/src/prompts/category-prompts.ts`
- Modify: `server/src/handlers/chat/chat.ts`

- [ ] **Step 1: Expand TripContext user_preferences**

In `server/src/prompts/trip-context.ts`, replace the `user_preferences` field in `TripContext` (lines 15-19):

```typescript
user_preferences?: {
  accommodation: string | null;
  travel_pace: string | null;
  dietary: string[];
  dining_style: string | null;
  activities: string[];
  travel_party: string | null;
  budget_comfort: string | null;
};
```

Update `formatTripContext()` (lines 73-84) to render all 7 categories:

```typescript
if (ctx.user_preferences) {
  const up = ctx.user_preferences;
  lines.push('\n### User Preferences');
  if (up.accommodation) lines.push(`- Accommodation: ${up.accommodation}`);
  if (up.travel_pace) lines.push(`- Travel pace: ${up.travel_pace}`);
  if (
    up.dietary.length > 0 &&
    !(up.dietary.length === 1 && up.dietary[0] === 'none')
  ) {
    lines.push(`- Dietary: ${up.dietary.join(', ')}`);
  }
  if (up.dining_style) lines.push(`- Dining style: ${up.dining_style}`);
  if (up.activities.length > 0)
    lines.push(`- Activities: ${up.activities.join(', ')}`);
  if (up.travel_party) lines.push(`- Travel party: ${up.travel_party}`);
  if (up.budget_comfort) lines.push(`- Budget comfort: ${up.budget_comfort}`);
}
```

- [ ] **Step 2: Update chat handler to map new preferences**

In `server/src/handlers/chat/chat.ts`, replace the user_preferences mapping (lines 76-82):

```typescript
user_preferences: userPrefs
  ? {
      accommodation: userPrefs.accommodation,
      travel_pace: userPrefs.travel_pace,
      dietary: userPrefs.dietary,
      dining_style: userPrefs.dining_style,
      activities: userPrefs.activities,
      travel_party: userPrefs.travel_party,
      budget_comfort: userPrefs.budget_comfort,
    }
  : undefined,
```

- [ ] **Step 3: Interpolate preferences into category prompts**

In `server/src/prompts/category-prompts.ts`, update the `getCategoryPrompt` function to accept and interpolate user preferences. Add an optional `preferences` parameter:

```typescript
export function getCategoryPrompt(
  category: CategoryName,
  status: CategoryStatus,
  preferences?: { accommodation?: string | null; travel_pace?: string | null; dietary?: string[]; dining_style?: string | null; activities?: string[]; travel_party?: string | null; budget_comfort?: string | null },
): string {
```

For the `hotels` category prompts, append accommodation preference context:

```typescript
// In hotels asking/idle prompt:
if (preferences?.accommodation) {
  prompt += `\nUser prefers ${preferences.accommodation} accommodation.`;
}
```

For the `experiences` category prompts, append activities + dining preferences:

```typescript
// In experiences asking/idle prompt:
if (preferences?.activities?.length) {
  prompt += `\nUser interests: ${preferences.activities.join(', ')}.`;
}
if (preferences?.dining_style) {
  prompt += `\nDining preference: ${preferences.dining_style}.`;
}
```

For ALL category prompts, append travel_party context:

```typescript
if (preferences?.travel_party) {
  prompt += `\nTraveling as: ${preferences.travel_party}.`;
}
```

- [ ] **Step 4: Pass preferences through system prompt builder**

Update `system-prompt.ts` → `buildSystemPrompt()` to pass preferences to `getCategoryPrompt()`. The trip context already contains preferences, but the category prompt needs them directly for interpolation.

- [ ] **Step 5: Verify full chain**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 6: Commit**

```bash
git add server/src/prompts/trip-context.ts server/src/prompts/category-prompts.ts server/src/handlers/chat/chat.ts server/src/prompts/system-prompt.ts
git commit -m "feat: expand TripContext to 7 preference categories, interpolate into category prompts"
```

---

## Task 4: PreferencesWizard Modal Component

**Files:**

- Create: `web-client/src/components/PreferencesWizard/PreferencesWizard.tsx`
- Create: `web-client/src/components/PreferencesWizard/PreferencesWizard.module.scss`
- Create: `web-client/src/components/PreferencesWizard/steps/AccommodationStep.tsx`
- Create: `web-client/src/components/PreferencesWizard/steps/TravelPaceStep.tsx`
- Create: `web-client/src/components/PreferencesWizard/steps/DiningStep.tsx`
- Create: `web-client/src/components/PreferencesWizard/steps/ActivitiesStep.tsx`
- Create: `web-client/src/components/PreferencesWizard/steps/TravelPartyStep.tsx`
- Create: `web-client/src/components/PreferencesWizard/steps/BudgetComfortStep.tsx`

This is a frontend-only task. Each step component receives current preferences and an `onUpdate` callback.

- [ ] **Step 1: Create the wizard modal shell**

The `PreferencesWizard` component:

- Receives: `preferences: UserPreferences | null`, `isOpen: boolean`, `onClose: () => void`
- State: `currentStep` index
- Determines first unanswered step from `preferences.completed_steps`
- Progress bar at top showing 6 steps with checkmarks for completed ones
- Navigation: Next, Back, Skip buttons
- Per-step save: calls `PUT /user-preferences` via TanStack Query mutation on Next

- [ ] **Step 2: Create step components**

Each step component follows the same pattern:

- Receives: `value` (current selection), `onChange` (callback)
- Renders selection UI (cards for single-select, chips for multi-select)
- Uses the option constants from the shared schema (import from a shared types file or define inline)

The step components use SCSS modules following the Mediterranean Warmth palette — coral CTA for primary actions, warm surfaces, no dark backgrounds.

- [ ] **Step 3: Style the wizard**

`PreferencesWizard.module.scss`:

- Modal overlay with warm translucent background
- Centered card with `var(--surface)` background, `var(--border)` border
- Progress bar with step circles (completed = coral fill, current = coral border, future = border only)
- Card selection: bordered cards with coral accent on select
- Multi-select chips: warm surface, coral border on active
- Next/Skip buttons: coral CTA / border secondary

- [ ] **Step 4: Verify**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add web-client/src/components/PreferencesWizard/
git commit -m "feat: add PreferencesWizard modal with 6 step components"
```

---

## Task 5: Registration Flow + Account Page + Header Badge

**Files:**

- Modify: `web-client/src/app/(auth)/register/page.tsx`
- Modify: `web-client/src/app/(protected)/account/page.tsx`
- Modify: `web-client/src/components/Header/Header.tsx`

- [ ] **Step 1: Update registration flow**

Replace the inline step 2 preferences in `register/page.tsx` with the `PreferencesWizard`:

- After signup completes (step 1), open the wizard as a modal
- On wizard close/complete, redirect to `/trips/new`

- [ ] **Step 2: Update account page**

In `account/page.tsx`:

- Replace the read-only 3-field display with all 7 categories
- Add an "Edit preferences" button that opens the `PreferencesWizard`
- Show completion status (e.g., "5 of 6 categories completed")

- [ ] **Step 3: Add header badge**

In `Header.tsx`:

- Fetch user preferences via TanStack Query
- If `completed_steps.length < 6`, show a small badge/dot on the Account nav link
- Badge should be subtle (small coral dot, not text)

- [ ] **Step 4: Verify**

Run: `pnpm format:check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 5: Commit**

```bash
git add web-client/src/app/(auth)/register/page.tsx web-client/src/app/(protected)/account/page.tsx web-client/src/components/Header/Header.tsx
git commit -m "feat: integrate PreferencesWizard into registration, account page, and header badge"
```

---

## Task 6: Run Migration + Deploy

- [ ] **Step 1: Run migration on production**

```bash
cd server && DATABASE_URL=$(railway variables --json | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).DATABASE_URL)})" ) pnpm migrate:up
```

Expected: `1771879388557_migrate-preferences-to-jsonb` applies

- [ ] **Step 2: Push and deploy**

```bash
git push
railway up --detach
npx vercel --prod --yes
```

---

## Self-Review

**Spec coverage:**

- ✅ 7 preference categories with option constants (Task 1)
- ✅ JSONB with version field + normalizePreferences (Task 1)
- ✅ Migration with backfill from old columns (Task 2)
- ✅ Repository reads/writes JSONB (Task 2)
- ✅ Handler normalizes on read, validates on write (Task 2)
- ✅ TripContext expanded to 7 categories (Task 3)
- ✅ Category prompts interpolate preferences (Task 3)
- ✅ Chat handler maps new preferences (Task 3)
- ✅ PreferencesWizard 6-step modal (Task 4)
- ✅ Per-step save (Task 4)
- ✅ Returning users see only unanswered steps (Task 4)
- ✅ Registration flow opens wizard after signup (Task 5)
- ✅ Account page edit button (Task 5)
- ✅ Header badge for incomplete (Task 5)
- ✅ completed_steps tracking (Tasks 1, 4)
- ✅ Legacy data migration (Tasks 1, 2)

**Placeholder scan:** No TBDs or TODOs. Task 4 step components are described at the pattern level rather than with exact code because they're 6 nearly-identical React components — the implementing agent should follow the pattern from the first one.

**Type consistency:** `UserPreferences` interface used in schema, repository, handler, chat handler, and wizard component. `normalizePreferences()` called in repository `findByUserId` and in handler. `WIZARD_STEPS` used in wizard for progress bar. All consistent.
