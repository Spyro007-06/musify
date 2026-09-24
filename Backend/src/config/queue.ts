import IORedis from 'ioredis';
import { env } from './env';
import { logger } from '@utils/logger';

export const queueEnabled = Boolean(env.REDIS_URL);

/**
 * BullMQ's own connection, separate from `@config/redis`'s `@upstash/redis`
 * REST client — BullMQ needs blocking commands (BRPOPLPUSH et al) and Lua
 * scripting that a REST-based client can't provide, so it always gets a
 * plain `ioredis` connection instead, over REDIS_URL.
 *
 * `maxRetriesPerRequest: null` is BullMQ's own documented requirement (it
 * manages retries itself); without it, ioredis's own retry limit can cause
 * BullMQ's blocking calls to throw instead of just waiting.
 */
export const queueConnection = queueEnabled
  ? new IORedis(env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // Upstash's TCP endpoint (and most managed Redis) requires TLS on
      // the `rediss://` scheme; a local dev `redis://` connection doesn't.
      ...(env.REDIS_URL!.startsWith('rediss://') ? { tls: {} } : {}),
    })
  : null;

if (queueEnabled) {
  queueConnection!.on('error', (err) => {
    logger.error(`BullMQ Redis connection error: ${err.message}`);
  });
  queueConnection!.on('connect', () => {
    logger.info('BullMQ Redis connection established — background jobs enabled.');
  });
} else {
  logger.info('REDIS_URL not set — background job queue is disabled; jobs will not be enqueued.');
}

/** Lightweight reachability check for the readiness endpoint — never throws. */
export async function checkQueueRedis(): Promise<'ok' | 'unreachable' | 'disabled'> {
  if (!queueEnabled) return 'disabled';
  try {
    await queueConnection!.ping();
    return 'ok';
  } catch {
    return 'unreachable';
  }
}
