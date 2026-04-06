import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Content guard for the BookingConfirmation component.
 *
 * Locks in the UX-02 / CRIT-02 fix: the pre-audit component ran a
 * hard-coded 2200ms "booking..." spinner followed by a 1500ms
 * "confirmed!" state and then auto-called onConfirm. The entire flow
 * was a trust bomb: a user who mis-clicked could not cancel, and no
 * actual booking ever happened. This test guards against regression
 * to that pattern.
 */

const componentPath = resolve(__dirname, 'BookingConfirmation.tsx');
const componentSource = readFileSync(componentPath, 'utf-8');

describe('BookingConfirmation content', () => {
  it('does not auto-advance to a fake booking stage on a timer', () => {
    expect(componentSource).not.toMatch(/setTimeout.*setStage.*booking/);
    expect(componentSource).not.toMatch(/setTimeout.*setStage.*confirmed/);
    expect(componentSource).not.toMatch(/setTimeout\(onConfirm/);
  });

  it('uses honest "Save itinerary" button text, not "Confirm Booking"', () => {
    expect(componentSource).not.toContain('Confirm Booking');
    expect(componentSource).toContain('Save itinerary');
  });

  it('explains that nothing is actually booked', () => {
    expect(componentSource).toMatch(
      /Nothing is actually booked|no actual bookings|not a commercial booking/i,
    );
  });
});
