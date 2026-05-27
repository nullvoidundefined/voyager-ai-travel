import { query } from 'app/db/pool/pool.js';

export interface TripLeg {
  id: string;
  trip_id: string;
  origin: string;
  destination: string;
  depart_date: string;
  leg_order: number;
  created_at: string;
}

export interface CreateLegInput {
  origin: string;
  destination: string;
  depart_date: string;
  leg_order: number;
}

export async function createLeg(
  tripId: string,
  input: CreateLegInput,
): Promise<TripLeg> {
  const result = await query<TripLeg>(
    `INSERT INTO trip_legs (trip_id, origin, destination, depart_date, leg_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      tripId,
      input.origin,
      input.destination,
      input.depart_date,
      input.leg_order,
    ],
  );
  return result.rows[0];
}

export async function listLegs(tripId: string): Promise<TripLeg[]> {
  const result = await query<TripLeg>(
    `SELECT * FROM trip_legs WHERE trip_id = $1 ORDER BY leg_order ASC`,
    [tripId],
  );
  return result.rows;
}

export async function deleteLeg(legId: string): Promise<void> {
  await query(`DELETE FROM trip_legs WHERE id = $1`, [legId]);
}

export async function reorderLegs(orderedIds: string[]): Promise<void> {
  const cases = orderedIds
    .map((id, i) => `WHEN id = '${id}' THEN ${i + 1}`)
    .join(' ');
  await query(
    `UPDATE trip_legs SET leg_order = CASE ${cases} END WHERE id = ANY($1)`,
    [orderedIds],
  );
}
