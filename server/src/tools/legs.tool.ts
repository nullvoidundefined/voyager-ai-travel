import type {
  CreateLegInput,
  TripLeg,
} from 'app/repositories/trips/trip-legs.repository.js';

import type { ToolContext } from './executor.js';

export interface LegsAdapters {
  createLeg: (tripId: string, input: CreateLegInput) => Promise<TripLeg>;
  listLegs: (tripId: string) => Promise<TripLeg[]>;
  deleteLeg: (legId: string) => Promise<void>;
  reorderLegs: (orderedIds: string[]) => Promise<void>;
}

export async function handleAddLeg(
  input: {
    origin: string;
    destination: string;
    depart_date: string;
    leg_order: number;
  },
  ctx: ToolContext,
  adapters: LegsAdapters,
) {
  const leg = await adapters.createLeg(ctx.tripId, input);
  return { leg };
}

export async function handleRemoveLeg(
  input: { leg_id: string },
  ctx: ToolContext,
  adapters: LegsAdapters,
) {
  await adapters.deleteLeg(input.leg_id);
  return { deleted: input.leg_id };
}

export async function handleReorderLegs(
  input: { ordered_leg_ids: string[] },
  ctx: ToolContext,
  adapters: LegsAdapters,
) {
  await adapters.reorderLegs(input.ordered_leg_ids);
  return { reordered: true };
}
