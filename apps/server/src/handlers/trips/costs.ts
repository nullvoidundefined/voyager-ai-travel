import { query } from 'app/db/pool/pool.js';
import type { Request, Response } from 'express';

export async function getTripCostsHandler(req: Request, res: Response) {
  const { id: tripId } = req.params;
  const result = await query<{ total_tokens: string; total_cost: string }>(
    `SELECT
       COALESCE(SUM(atc.input_tokens + atc.output_tokens), 0)::int AS total_tokens,
       COALESCE(SUM(atc.estimated_cost_usd), 0)::numeric(10,6) AS total_cost
     FROM agent_turn_cost atc
     JOIN conversations c ON c.id = atc.conversation_id
     WHERE c.trip_id = $1`,
    [tripId],
  );
  const { total_tokens, total_cost } = result.rows[0];
  res.json({
    total_tokens: Number(total_tokens),
    total_cost_usd: Number(total_cost).toFixed(4),
  });
}
