import { isProduction } from 'app/config/env.js';
import { logger } from 'app/utils/logs/logger.js';
import rateLimit, { type Store } from 'express-rate-limit';
import { Redis } from 'ioredis';
import RedisStore from 'rate-limit-redis';

/**
 * SEC-04 (2026-04-06 audit): Redis-backed rate limiter storage.
 *
 * Pre-audit, every limiter used in-memory storage, which silently
 * breaks across multi-replica deploys: two instances would each
 * track their own counters and an attacker hitting both could
 * burst to 2x the configured rate. The handler also maintained an
 * in-memory activeConversations Set that had the same problem.
 *
 * This module now lazily creates a shared Redis client when
 * REDIS_URL is set and plumbs it through a RedisStore (from
 * rate-limit-redis) to every limiter. When REDIS_URL is not set
 * (local dev, tests) the limiters fall back to in-memory storage
 * so developer workflows stay fast.
 *
 * The activeConversations Redis migration is a separate follow-up
 * because the chat handler's lock is a SET-NX pattern rather than
 * a counter; it has different semantics than rate limiting.
 */

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }
  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      // enableOfflineQueue MUST stay true (the ioredis default).
      // rate-limit-redis's RedisStore constructor synchronously
      // calls loadIncrementScript() which sendCommand()s the EVAL
      // SHA before the TCP connection is established. With offline
      // queue disabled, ioredis throws "Stream isn't writeable"
      // and the unhandled rejection kills the server at boot.
      // Regression test: rateLimiter.boot.test.ts
      enableOfflineQueue: true,
      // Make connection retries lazy so a momentarily-unreachable
      // Redis at startup degrades gracefully into rate-limit
      // failures instead of taking down the whole API server.
      lazyConnect: false,
    });
    redisClient.on('error', (err: Error) => {
      logger.error({ err }, 'Redis connection error in rate limiter');
    });
    return redisClient;
  } catch (err) {
    logger.error({ err }, 'Failed to create Redis client for rate limiter');
    return null;
  }
}

/**
 * Returns true when the request should bypass rate limiting.
 * E2E suites set E2E_BYPASS_RATE_LIMITS=1 because they seed
 * dozens of users and trips per run from a single IP and would
 * otherwise hit the 10-per-15-min auth limit immediately. The
 * unit and integration tests do NOT set this flag, so they
 * still exercise the limiter behavior.
 */
function shouldBypass(): boolean {
  return process.env.E2E_BYPASS_RATE_LIMITS === '1';
}

function makeStore(prefix: string): Store | undefined {
  const client = getRedisClient();
  if (!client) {
    if (isProduction()) {
      logger.warn(
        { prefix },
        'Rate limiter falling back to in-memory store in production (REDIS_URL not set)',
      );
    }
    return undefined;
  }
  return new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (...args: string[]) => (client as any).call(...args),
    prefix: `voyager-rl:${prefix}:`,
  }) as unknown as Store;
}

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldBypass,
  store: makeStore('global'),
});

/**
 * Per-user limit for the chat/agent endpoint — the most expensive
 * endpoint (triggers multiple Claude API calls + SerpApi calls per
 * request). Keyed by authenticated user ID, not IP.
 */
export const chatRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  message: {
    error: 'RATE_LIMITED',
    message: 'Please wait before sending another message.',
  },
  skip: shouldBypass,
  store: makeStore('chat'),
});

/** Stricter limit for auth routes to resist credential stuffing. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldBypass,
  store: makeStore('auth'),
});
