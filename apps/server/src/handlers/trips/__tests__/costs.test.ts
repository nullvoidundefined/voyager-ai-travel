import * as pool from 'app/db/pool/pool.js';
import * as costsHandlers from 'app/handlers/trips/costs.js';
import { errorHandler } from 'app/middleware/errorHandler/errorHandler.js';
import { uuid } from 'app/utils/tests/uuids.js';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/db/pool/pool.js');

const tripId = uuid(1);

function createApp() {
  const app = express();
  app.use(express.json());
  app.get('/trips/:id/costs', costsHandlers.getTripCostsHandler);
  app.use(errorHandler);
  return app;
}

describe('GET /trips/:id/costs', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns 200 with total_tokens and total_cost_usd', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ total_tokens: '12400', total_cost: '0.003100' }],
      rowCount: 1,
    } as never);

    const app = createApp();
    const res = await request(app).get(`/trips/${tripId}/costs`);
    expect(res.status).toBe(200);
    expect(typeof res.body.total_tokens).toBe('number');
    expect(typeof res.body.total_cost_usd).toBe('string');
  });

  it('returns zeros when no cost rows exist', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({
      rows: [{ total_tokens: '0', total_cost: '0.000000' }],
      rowCount: 1,
    } as never);

    const app = createApp();
    const res = await request(app).get(`/trips/${tripId}/costs`);
    expect(res.status).toBe(200);
    expect(res.body.total_tokens).toBe(0);
    expect(res.body.total_cost_usd).toBe('0.0000');
  });
});
