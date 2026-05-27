# Design/Tokens Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 14 design findings: foreign tokens in DemoBanner/AlertDialog, --cta vs --accent unification, spacing/breakpoint/overlay/font tokens, shared keyframe animations, Toast variants, tile scroll affordance, and focus ring fixes.

**Architecture:** Define new CSS custom property tokens in globals.scss, then migrate components to use them. Extract shared animations to a new file. All changes are SCSS-only except Toast variants (TSX + SCSS).

**Tech Stack:** Next.js 15, SCSS Modules, CSS Custom Properties

---

## Task 1: Define new tokens in globals.scss [trivial]

Add missing token categories to the `:root` block in `web-client/src/app/globals.scss`. Insert after the `--transition-med` line (line 68), before the closing `}`.

**Files:** `web-client/src/app/globals.scss`

### Steps

- [ ] Add the following token block after `--transition-med: 0.3s var(--ease-out);` (line 68) and before the closing `}` (line 69):

```scss
/* -- Spacing scale -- */
--space-2xs: 2px;
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;

/* -- Breakpoints (reference; media queries use raw values) -- */
--bp-mobile: 480px;
--bp-tablet: 768px;
--bp-desktop: 1024px;
--bp-wide: 1440px;

/* -- Overlay -- */
--overlay-bg: rgba(0, 0, 0, 0.5);

/* -- Font extras -- */
--font-weight-bold: 700;
--font-mono: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
```

- [ ] Verify the file parses correctly: `pnpm --filter voyager-web build`.

---

## Task 2: Rewrite DemoBanner foreign tokens [trivial]

Replace all `--color-*` foreign tokens with Voyager design tokens from globals.scss. The DemoBanner is a warning/demo banner, so it uses `--warning` palette colors.

**Files:** `web-client/src/components/DemoBanner/DemoBanner.module.scss`

### Steps

- [ ] Replace the entire file content with:

```scss
.banner {
  width: 100%;
  padding: 10px 20px;
  background: rgba(245, 158, 11, 0.08);
  border-bottom: 1px solid rgba(245, 158, 11, 0.25);
  font-size: 13px;
  line-height: 1.5;
  color: var(--foreground-muted);
  text-align: center;
  z-index: 10;
  position: relative;
}

.content {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(245, 158, 11, 0.15);
  border-radius: 4px;
  color: var(--warning-dark);
}

.text {
  color: inherit;
}

.link {
  color: var(--warning-dark);
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    color: var(--foreground);
  }
}

@media (max-width: 600px) {
  .banner {
    padding: 8px 12px;
    font-size: 12px;
  }

  .content {
    gap: 4px;
  }
}
```

- [ ] Visually verify the DemoBanner in the browser (run `pnpm --filter voyager-web dev`) to confirm it renders with warning-toned styling.

---

## Task 3: Fix AlertDialog tokens and fallbacks [trivial]

The confirmButton fallback is `#c2410c` (burnt orange) but `--accent` is `#1e56a0` (blue). The `--accent-dark` token does not exist; use `--accent-hover`. Replace string `ease-out` with the token.

**Files:** `web-client/src/components/ui/AlertDialog/AlertDialog.module.scss`

### Steps

- [ ] On line 6, replace `ease-out` with `var(--ease-out)`:

```scss
animation: fadeIn 150ms var(--ease-out);
```

- [ ] On line 21, replace `ease-out` with `var(--ease-out)`:

```scss
animation: slideUp 180ms var(--ease-out);
```

- [ ] On line 55, replace `ease-out` with `var(--ease-out)`:

```scss
transition: background 120ms var(--ease-out);
```

- [ ] On line 68, fix the confirmButton fallback and replace `--accent-dark`:

```scss
.confirmButton {
  background: var(--accent);
  color: #ffffff;

  &:hover {
    background: var(--accent-hover);
  }
}
```

This removes the incorrect `#c2410c` fallback (the token is defined in globals.scss, so no fallback is needed) and replaces the nonexistent `--accent-dark` with `--accent-hover`.

- [ ] Verify build passes: `pnpm --filter voyager-web build`.

---

## Task 4: Unify --cta vs --accent for primary actions [trivial]

Decision: `--cta` (coral `#e8614d`) is for primary/confirmation actions. `--accent` (blue `#1e56a0`) is for informational/secondary elements (links, input focus rings, chat typing indicators).

**Files:**

- `web-client/src/components/ChatBox/widgets/SelectableCardGroup.module.scss`
- `web-client/src/components/ChatBox/TripDetailsForm.module.scss`
- `web-client/src/components/BookingConfirmation/BookingConfirmation.module.scss`

### Steps

- [ ] In `SelectableCardGroup.module.scss`, line 33, change the confirm button background from `var(--accent)` to `var(--cta)`:

```scss
.confirmButton {
  align-self: flex-start;
  padding: 10px 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--cta);
  color: var(--cta-text);
```

- [ ] In `TripDetailsForm.module.scss`, line 82, change the submit button background from `var(--accent)` to `var(--cta)`:

```scss
.submit {
  margin-top: 6px;
  padding: 10px 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--cta);
  color: var(--cta-text);
```

- [ ] In the same file, line 93, change the hover from `var(--accent-hover)` to `var(--cta-hover)`:

```scss
&:hover:not(:disabled) {
  background: var(--cta-hover);
  box-shadow: var(--shadow-glow);
}
```

- [ ] In `BookingConfirmation.module.scss`, line 230, change the spinner border-top-color from `var(--accent)` to `var(--cta)`:

```scss
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--cta);
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: spin 0.8s linear infinite;
}
```

- [ ] Verify build passes: `pnpm --filter voyager-web build`.

---

## Task 5: Fix logo color consistency [trivial]

Header uses `var(--cta)` (coral) for the logo. Footer uses `var(--foreground)` (navy). Both should use `var(--cta)` for brand consistency.

**Files:** `web-client/src/components/Footer/Footer.module.scss`

### Steps

- [ ] On line 25, change the logo color from `var(--foreground)` to `var(--cta)`:

```scss
.logo {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--cta);
}
```

- [ ] Verify build passes: `pnpm --filter voyager-web build`.

---

## Task 6: Extract shared keyframe animations [standard]

Six keyframe animations are duplicated across 11 files. CSS Modules automatically scopes `@keyframes` names within `.module.scss` files. Since `globals.scss` is imported as a side-effect in the root layout, keyframes defined there are globally available. When a `.module.scss` file references a keyframe name that has no local `@keyframes` declaration, CSS Modules passes the name through unscoped, matching the global definition.

Strategy: define canonical keyframes in a new global file imported from the root layout; remove local duplicates from each `.module.scss` file.

**Keyframe duplication map:**

| Keyframe      | Files                                                      |
| ------------- | ---------------------------------------------------------- |
| `fadeIn`      | AlertDialog, PreferencesWizard, BookingConfirmation        |
| `slideUp`     | AlertDialog, PreferencesWizard, BookingConfirmation, Toast |
| `fadeSlideIn` | ChatBox, VirtualizedChat, MockChatBox                      |
| `typingDot`   | ChatBox, MockChatBox                                       |
| `spin`        | newTrip, BookingConfirmation                               |
| `scaleIn`     | BookingConfirmation                                        |

Note: The `slideUp` keyframe has two variants. AlertDialog uses `translate(-50%, ...)` because the element is `position: fixed; left: 50%; top: 50%`, while the others use simple `translateY`. AlertDialog must keep its local version. Toast uses `translateX(-50%) translateY(...)` because it is `left: 50%; transform: translateX(-50%)`. Toast must also keep its local version. The shared `slideUp` covers PreferencesWizard and BookingConfirmation (both use simple `translateY(16px)` to `translateY(0)`).

**Files:**

- `web-client/src/styles/animations.scss` (new file)
- `web-client/src/app/layout.tsx`
- `web-client/src/components/ui/AlertDialog/AlertDialog.module.scss`
- `web-client/src/components/PreferencesWizard/PreferencesWizard.module.scss`
- `web-client/src/components/BookingConfirmation/BookingConfirmation.module.scss`
- `web-client/src/components/Toast/Toast.module.scss`
- `web-client/src/components/ChatBox/ChatBox.module.scss`
- `web-client/src/components/ChatBox/VirtualizedChat.module.scss`
- `web-client/src/components/MockChatBox/MockChatBox.module.scss`
- `web-client/src/app/(protected)/trips/new/newTrip.module.scss`

### Steps

- [ ] Create directory and file `web-client/src/styles/animations.scss`:

```scss
/* Shared keyframe animations.
 * Imported globally via layout.tsx so all .module.scss files
 * can reference these names without local @keyframes declarations.
 * CSS Modules passes through keyframe names that have no local definition,
 * so these global names are resolved at runtime.
 */

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes typingDot {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  30% {
    opacity: 1;
    transform: scale(1.15);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

- [ ] In `web-client/src/app/layout.tsx`, add the import right after the `globals.scss` import (line 12):

```tsx
import '../styles/animations.scss';
import './globals.scss';
```

- [ ] In `PreferencesWizard.module.scss`, remove the `@keyframes fadeIn` block (lines 15-21) and the `@keyframes slideUp` block (lines 40-49). The `animation` references on lines 12 and 37 stay as-is; they will resolve to the global keyframes.

- [ ] In `BookingConfirmation.module.scss`, remove the `@keyframes fadeIn` block (lines 253-260), `@keyframes slideUp` block (lines 262-271), `@keyframes spin` block (lines 273-277), and `@keyframes scaleIn` block (lines 279-288). Keep the `animation` references in place.

- [ ] In `ChatBox.module.scss`, remove the `@keyframes typingDot` block (lines 134-145) and `@keyframes fadeSlideIn` block (lines 222-229). Keep the `animation` references.

- [ ] In `VirtualizedChat.module.scss`, remove the `@keyframes fadeSlideIn` block (lines 85-94). Keep the `animation` reference.

- [ ] In `MockChatBox.module.scss`, remove the `@keyframes fadeSlideIn` block (lines 136-145) and `@keyframes typingDot` block (lines 171-181). Keep the `animation` references.

- [ ] In `newTrip.module.scss`, remove the `@keyframes spin` block (lines 44-48). Keep the `animation` reference on line 41.

- [ ] Keep the local `@keyframes` in these files (they have variant-specific transforms):
  - `AlertDialog.module.scss`: keep both `fadeIn` (lines 85-92) and `slideUp` (lines 94-103); the `slideUp` uses `translate(-50%, -44%)` to `translate(-50%, -50%)` which is specific to the centered positioning.
  - `Toast.module.scss`: keep its `slideUp` (lines 38-47); uses `translateX(-50%) translateY(...)` which is specific to the centered-bottom positioning.

- [ ] Verify build passes: `pnpm --filter voyager-web build`.

- [ ] Visually verify at least one page that uses animations (the chat page, PreferencesWizard) to confirm animations still play correctly.

---

## Task 7: Fix minor token issues [trivial]

Fix ErrorBoundary foreign tokens and rem/em units, MarkdownText raw monospace, and raw `font-weight: 700` across the codebase.

**Files:**

- `web-client/src/components/ErrorBoundary/ErrorBoundary.module.scss`
- `web-client/src/components/ChatBox/nodes/MarkdownText.module.scss`

### Steps

- [ ] Replace the entire `ErrorBoundary.module.scss` file with px units and Voyager tokens:

```scss
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 32px;
  text-align: center;
}

.heading {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--foreground);
}

.message {
  color: var(--foreground-muted);
  margin-bottom: 24px;
  max-width: 400px;
}

.button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: var(--cta-text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: var(--accent-hover);
  }
}
```

- [ ] In `MarkdownText.module.scss`, line 72, replace `font-family: monospace` with the token:

```scss
font-family: var(--font-mono);
```

- [ ] Verify build passes: `pnpm --filter voyager-web build`.

---

## Task 8: Add Toast variants, tile scroll affordance, fix focus ring [standard]

Three small UI improvements bundled together because they each touch a single component file.

**Files:**

- `web-client/src/components/Toast/Toast.tsx`
- `web-client/src/components/Toast/Toast.module.scss`
- `web-client/src/components/ChatBox/nodes/TileLayout.module.scss`
- `web-client/src/components/PreferencesWizard/PreferencesWizard.module.scss`

### Steps

#### Toast variants

- [ ] Update `Toast.tsx` to accept a `variant` prop:

```tsx
'use client';

import { useEffect } from 'react';

import styles from './Toast.module.scss';

type ToastVariant = 'danger' | 'success' | 'info';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
  variant?: ToastVariant;
}

export function Toast({
  message,
  onClose,
  duration = 5000,
  variant = 'danger',
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`${styles.toast} ${styles[variant]}`}>
      <span>{message}</span>
      <button
        type='button'
        className={styles.close}
        onClick={onClose}
        aria-label='Dismiss'
      >
        &times;
      </button>
    </div>
  );
}
```

- [ ] Update `Toast.module.scss` to add variant classes. Replace the `background: var(--danger)` line (line 12) with no default background, and add variant classes after `.toast`:

```scss
.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-radius: var(--radius-md);
  color: var(--cta-text);
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-body);
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.3s var(--ease-out);
  max-width: min(90vw, 480px);
}

.danger {
  background: var(--danger);
}

.success {
  background: var(--success);
}

.info {
  background: var(--accent);
}

.close {
  background: none;
  border: none;
  color: var(--cta-text);
  font-size: 18px;
  cursor: pointer;
  opacity: 0.6;
  line-height: 1;
  padding: 0 2px;
  transition: opacity var(--transition-fast);

  &:hover {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}
```

- [ ] Verify existing Toast callsites still work (they pass no `variant`, so they default to `danger`). Search for Toast usage:

```bash
grep -rn '<Toast' web-client/src/ --include="*.tsx"
```

#### Tile scroll affordance

- [ ] In `TileLayout.module.scss`, add a gradient fade overlay to signal horizontal scroll. Replace the entire file:

```scss
.verticalStack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.horizontalScroll {
  position: relative;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  mask-image: linear-gradient(
    to right,
    black 0%,
    black calc(100% - 32px),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    black 0%,
    black calc(100% - 32px),
    transparent 100%
  );
}
```

#### Focus ring fix

- [ ] In `PreferencesWizard.module.scss`, replace the `.select:focus` block (lines 404-407) with a visible focus ring:

```scss
&:focus {
  outline: 2px solid var(--cta);
  outline-offset: 2px;
}
```

- [ ] Verify build passes: `pnpm --filter voyager-web build`.

---

## Verification

After all 8 tasks are complete:

- [ ] Run the full verification chain:

```bash
pnpm exec prettier --config prettier.config.bottomlessmargaritas.mjs --write "web-client/src/**/*.scss" "web-client/src/components/Toast/Toast.tsx"
pnpm format:check && pnpm lint && pnpm test && pnpm build
```

- [ ] Visually spot-check in the browser:
  - DemoBanner renders with warm amber/warning tones (not broken orange Tailwind colors)
  - AlertDialog confirm button is blue (not burnt orange)
  - Submit/confirm buttons across TripDetailsForm, SelectableCardGroup, BookingConfirmation spinner are coral (--cta)
  - Footer logo is coral, matching header
  - Toast renders in danger (red), success (green), and info (blue) variants
  - TileLayout horizontal scroll shows gradient fade on right edge
  - PreferencesWizard select elements show coral outline on focus
  - Animations (slideUp, fadeSlideIn, spin) still play on pages that use them
