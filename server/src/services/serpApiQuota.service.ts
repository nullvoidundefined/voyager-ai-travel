import { logger } from 'app/utils/logs/logger.js';
import { Redis } from 'ioredis';

/**
 * Monthly quota counter for SerpApi calls.
 *
 * The SerpApi free tier is 250 searches per month. Hitting the ceiling
 * is not a billing risk (SerpApi does not charge past the free cap
 * unless you upgrade), but the failure mode is silent: the agent loop
 * will receive HTTP errors, the circuit breaker will open, and the
 * agent may hallucinate flight data from the error strings rather
 * than gracefully explain that search is unavailable.
 *
 * This service provides a second line of defense: a Redis-backed
 * counter keyed by YYYY-MM that refuses calls past a conservative
 * cap (200) with a 50-search safety reserve. Callers (the flight,
 * hotel tools) check isOverMonthlyCap before calling serpApiGet, and
 * on cap breach return a graceful "flight search temporarily
 * unavailable" result to the agent.
 *
 * Fails open: if Redis is unavailable we return usage=0 and let the
 * call through. A Redis outage should not block legitimate usage.
 */

export const SERPAPI_MONTHLY_CAP = 200;

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) {
    return redis;
  }
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('error', (err: Error) => {
      logger.error({ err }, 'Redis connection error in serpApiQuota');
    });
    return redis;
  } catch (err) {
    logger.error({ err }, 'Failed to create Redis client for serpApiQuota');
    return null;
  }
}

function yyyymmUtc(): string {
  return new Date().toISOString().slice(0, 7);
}

function keyFor(): string {
  return `serpapi-quota:${yyyymmUtc()}`;
}

/**
 * Returns the month-to-date SerpApi call count, or 0 if Redis is
 * unavailable or the counter does not exist.
 */
export async function getMonthlyUsage(): Promise<number> {
  const client = getRedis();
  if (!client) {
    return 0;
  }
  try {
    const raw = await client.get(keyFor());
    if (raw === null) {
      return 0;
    }
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (err) {
    logger.error({ err }, 'Failed to read SerpApi quota counter, failing open');
    return 0;
  }
}

/**
 * Increments the month-to-date SerpApi call counter by 1. Sets a
 * 32-day TTL so the counter auto-expires and restarts the next month.
 * No-op if Redis is unavailable.
 */
export async function incrementMonthlyUsage(): Promise<void> {
  const client = getRedis();
  if (!client) {
    return;
  }
  try {
    const key = keyFor();
    await client.incr(key);
    // 32 days: covers any month length plus a one-day safety margin.
    await client.expire(key, 32 * 24 * 60 * 60);
  } catch (err) {
    logger.error({ err }, 'Failed to increment SerpApi quota counter');
  }
}

/**
 * Returns true if the month-to-date SerpApi usage has met or
 * exceeded the configured cap. Fails open if Redis is down.
 */
export async function isOverMonthlyCap(): Promise<boolean> {
  const usage = await getMonthlyUsage();
  return usage >= SERPAPI_MONTHLY_CAP;
}
