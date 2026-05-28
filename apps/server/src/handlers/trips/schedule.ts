import { getAuthUser } from 'app/middleware/requireAuth/getAuthUser.js';
import { getScheduleForTrip } from 'app/repositories/trips/schedule.repository.js';
import { getTripWithDetails } from 'app/repositories/trips/trips.js';
import { ApiError } from 'app/utils/ApiError.js';
import type { Request, Response } from 'express';

export async function getScheduleHandler(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> {
  const { id: userId } = getAuthUser(req);
  const tripId = req.params.id;

  const trip = await getTripWithDetails(tripId, userId);
  if (!trip) {
    throw ApiError.forbidden('You do not have permission to view this trip');
  }

  const days = await getScheduleForTrip(tripId);
  res.json({ days });
}
