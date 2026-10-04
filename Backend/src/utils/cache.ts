import { redis, redisEnabled } from '@config/redis';
import { logger } from './logger';

// Without Redis, an in-process cache instead of none: on a single server it
// still skips repeat upstream calls (each JioSaavn round trip is seconds).
// Holds the promise, so concurrent callers share one in-flight call.
// ponytail: per-instance and capped at MEMORY_MAX_KEYS (oldest dropped first);
// set UPSTASH_REDIS_REST_URL/TOKEN for a cache shared across instances.
const MEMORY_MAX_KEYS = 500;
const memory = new Map<string, { value: Promise<unknown>; expires: number }>();

function withMemoryCache<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const hit = memory.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as Promise<T>;

  const value = fn();
  memory.delete(key); // re-insert at the end, so Map order is oldest-first
  memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  if (memory.size > MEMORY_MAX_KEYS) memory.delete(memory.keys().next().value!);
  // A failure isn't cached: the next call tries again.
  value.catch(() => {
    if (memory.get(key)?.value === value) memory.delete(key);
  });
  return value;
}

/** Empties the in-memory fallback (tests start each case cold). */
export function clearMemoryCache(): void {
  memory.clear();
}

/**
 * Cache-aside wrapper for expensive/external calls. Uses Redis when it's
 * configured, an in-process cache otherwise.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  if (!redisEnabled) return withMemoryCache(key, ttlSeconds, fn);

  try {
    const cached = await redis!.get<T>(key);
    if (cached !== null) return cached;
  } catch (err) {
    logger.warn(`Redis cache read failed for "${key}", falling back to live call:`, err);
  }

  const result = await fn();

  redis!.set(key, result, { ex: ttlSeconds }).catch((err) => {
    logger.warn(`Redis cache write failed for "${key}":`, err);
  });

  return result;
}
