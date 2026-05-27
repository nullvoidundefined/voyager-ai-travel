import * as chatHandlers from 'app/handlers/chat/chat.js';
import * as tripHandlers from 'app/handlers/trips/trips.js';
import { chatRateLimiter } from 'app/middleware/rateLimiter/rateLimiter.js';
import { requireAuth } from 'app/middleware/requireAuth/requireAuth.js';
import express from 'express';

const tripRouter = express.Router();

tripRouter.use(requireAuth);

tripRouter.post('/', tripHandlers.createTrip);
tripRouter.get('/', tripHandlers.listTrips);
tripRouter.get('/:id', tripHandlers.getTrip);
tripRouter.put('/:id', tripHandlers.updateTrip);
tripRouter.delete('/:id', tripHandlers.deleteTrip);

// B14: persist a single tile-card selection directly from the frontend.
tripRouter.post('/:id/selections', tripHandlers.selectItem);

// Test-only seam (ENG-17). The handler returns 404 unless
// E2E_BYPASS_RATE_LIMITS=1, and the route is not registered at all
// in production. Double gate: route registration + handler check.
if (process.env.NODE_ENV !== 'production') {
  tripRouter.post('/:id/test-selections', tripHandlers.seedSelections);
}

tripRouter.post('/:id/chat', chatRateLimiter, chatHandlers.chat);
tripRouter.get('/:id/messages', chatHandlers.getMessages);

export { tripRouter };
