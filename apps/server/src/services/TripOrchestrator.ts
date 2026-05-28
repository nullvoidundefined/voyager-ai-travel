import type { CompletionTracker } from 'app/prompts/booking-steps.js';
import type { FlowPosition } from 'app/prompts/booking-steps.js';
import type { TripState } from 'app/prompts/booking-steps.js';
import {
  EXPERIENCE_INTEREST_OPTIONS,
  FLIGHT_TRIP_TYPE_OPTIONS,
  type TripPlanCard,
} from 'app/types/plan-card.js';

export type SubAgentType =
  | 'detail'
  | 'plan'
  | 'flight'
  | 'hotel'
  | 'ground'
  | 'experience'
  | 'conversation'
  | 'fallback';

// Stubbed until Phase 4 (T9) wires the full routing table.
export function selectSubAgent(
  _flowPosition: FlowPosition,
  _tracker: CompletionTracker,
): SubAgentType {
  return 'fallback';
}

/**
 * Builds a TripPlanCard with deterministic defaults from trip state.
 * PlanAgent LLM receives this as a starting point and can adjust based
 * on conversation context before emitting the card to the user.
 */
export function buildDefaultPlanCard(trip: TripState): TripPlanCard {
  const flightsNotApplicable = trip.transport_mode === 'driving';
  const flightsNotApplicableReason = flightsNotApplicable
    ? 'Driving trip'
    : undefined;

  const isDayTrip =
    trip.departure_date !== null &&
    trip.return_date !== null &&
    trip.departure_date === trip.return_date;
  const hotelsNotApplicable = isDayTrip;
  const hotelsNotApplicableReason = isDayTrip ? 'Day trip' : undefined;

  const defaultTripType =
    trip.trip_type === 'one_way' ? 'one_way' : 'round_trip';

  return {
    categories: [
      {
        id: 'flights',
        label: 'Flight',
        enabled: !flightsNotApplicable,
        not_applicable: flightsNotApplicable,
        not_applicable_reason: flightsNotApplicableReason,
        sub_options: [
          {
            type: 'radio',
            id: 'trip_type',
            label: 'Trip type',
            options: FLIGHT_TRIP_TYPE_OPTIONS,
            value: defaultTripType,
          },
        ],
      },
      {
        id: 'hotels',
        label: 'Hotel',
        enabled: !hotelsNotApplicable,
        not_applicable: hotelsNotApplicable,
        not_applicable_reason: hotelsNotApplicableReason,
      },
      {
        id: 'car_rental',
        label: 'Car rental',
        enabled: false,
        not_applicable: false,
      },
      {
        id: 'experiences',
        label: 'Experiences',
        enabled: true,
        not_applicable: false,
        sub_options: [
          {
            type: 'multi',
            id: 'interests',
            label: 'Interests',
            options: EXPERIENCE_INTEREST_OPTIONS,
            values: [],
          },
        ],
      },
    ],
  };
}
