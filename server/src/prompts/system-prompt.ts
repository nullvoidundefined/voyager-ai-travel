import type { FlowPosition } from './booking-steps.js';
import { getCategoryPrompt, getPhasePrompt } from './category-prompts.js';
import { type TripContext, formatTripContext } from './trip-context.js';

const GUARDRAILS = `
## Guardrails
- If the user asks something unrelated to travel planning, answer briefly if it's harmless, then steer back to the trip. For illegal or harmful requests, decline: "I can't help with that. Let's focus on planning your trip."
- If the user asks about multi-city or multi-destination trips, explain that each trip covers one destination and suggest creating a separate trip for each leg.
- If the user wants to change their destination after bookings have started, warn them that changing will clear all current selections and ask for confirmation before calling update_trip.
- Review travel advisories in context. If they mention health risks (vaccinations, malaria zones, water safety), proactively mention these early — don't wait for the user to ask.`;

export function buildSystemPrompt(
  tripContext?: TripContext,
  flowPosition?: FlowPosition,
  options?: { hasCriticalAdvisory?: boolean },
): string {
  let stepPrompt: string;

  if (!flowPosition || flowPosition.phase === 'COLLECT_DETAILS') {
    stepPrompt = getPhasePrompt('COLLECT_DETAILS');
  } else if (flowPosition.phase === 'CATEGORY') {
    stepPrompt = getCategoryPrompt(
      flowPosition.category,
      flowPosition.status,
      tripContext?.user_preferences,
    );
  } else if (flowPosition.phase === 'CONFIRM') {
    stepPrompt = getPhasePrompt('CONFIRM');
  } else {
    stepPrompt = getPhasePrompt('COMPLETE');
  }

  const parts = [stepPrompt, GUARDRAILS];
  parts.push(
    `\n\n## Current Date\n\nToday is ${new Date().toISOString().split('T')[0]}.`,
  );

  if (options?.hasCriticalAdvisory) {
    parts.push(`\n\n## CRITICAL TRAVEL ADVISORY
A critical travel advisory is in effect for this destination. Before proceeding with any bookings, you MUST acknowledge the advisory and ask the user: "The US State Department advises against all travel to this destination. Are you sure you want to continue planning, or would you prefer a different destination?" Do not proceed to category bookings until the user explicitly confirms.`);
  }

  if (tripContext) {
    parts.push(
      `\n\n## Current Trip State\n\n${formatTripContext(tripContext)}`,
    );
  }

  return parts.join('');
}
