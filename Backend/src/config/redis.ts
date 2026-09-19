import { Redis } from '@upstash/redis';
import { env } from './env';
import { logger } from '@utils/logger';

export const redisEnabled = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

/**
 * Upstash Redis is entirely opt-in — with no UPSTASH_REDIS_REST_URL/TOKEN
 * set, `redis` is null and callers (rate limiter, Saavn cache) fall back to
 * their pre-Redis behavior (in-memory limiting, no caching).
 */
export const redis = redisEnabled
  ? new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

if (redisEnabled) {
  logger.info('Upstash Redis configured — distributed rate limiting and Saavn response caching enabled.');
} else {
  logger.info('UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is in-memory (per-instance) and Saavn responses are not cached.');
}
