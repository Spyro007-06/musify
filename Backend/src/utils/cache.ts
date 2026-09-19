import { redis, redisEnabled } from '@config/redis';
import { logger } from './logger';

/**
 * Cache-aside wrapper for expensive/external calls. A no-op passthrough
 * when Redis isn't configured, so callers don't need their own fallback.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  if (!redisEnabled) return fn();

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
