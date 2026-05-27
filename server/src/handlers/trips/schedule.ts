import { getAuthUser } from 'app/middleware/requireAuth/getAuthUser.js';
import { getScheduleForTrip } from 'app/repositories/trips/schedule.repository.js';
import type { Request, Response } from 'express';

export async function getScheduleHandler(
  req: Request,
  res: Response,
): Promise<void> {
  getAuthUser(req);
  const days = await getScheduleForTrip(req.params.id);
  res.json({ days });
}
