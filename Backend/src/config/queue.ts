import IORedis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from '@utils/logger';

export const queueEnabled = Boolean(env.REDIS_URL);

/**
 * BullMQ's connections, separate from `@config/redis`'s `@upstash/redis`
 * REST client — BullMQ needs blocking commands (BRPOPLPUSH et al) and Lua
 * scripting that a REST-based client can't provide, so it always gets a
 * plain `ioredis` connection instead, over REDIS_URL.
 */
function connect(role: string, options: RedisOptions): IORedis {
  const connection = new IORedis(env.REDIS_URL!, {
    enableReadyCheck: false,
    // Upstash's TCP endpoint (and most managed Redis) requires TLS on
    // the `rediss://` scheme; a local dev `redis://` connection doesn't.
    ...(env.REDIS_URL!.startsWith('rediss://') ? { tls: {} } : {}),
    ...options,
  });
  connection.on('error', (err) => logger.error(`BullMQ Redis (${role}) connection error: ${err.message}`));
  connection.on('connect', () => logger.info(`BullMQ Redis (${role}) connection established — background jobs enabled.`));
  return connection;
}

/**
 * The API side's connection: enqueueing jobs and the readiness check. Fails
 * fast — a command errors after 5 s (queued-while-disconnected ones too)
 * instead of waiting forever for Redis to come back, so a Redis outage can't
 * hang requests or Railway's /api/health/ready deploy healthcheck.
 */
export const queueConnection = queueEnabled ? connect('api', { maxRetriesPerRequest: 1, commandTimeout: 5000 }) : null;

/**
 * The worker process's connection. `maxRetriesPerRequest: null` is BullMQ's
 * own requirement for workers: their blocking reads wait for jobs, so
 * ioredis must never time them out. Created on demand, so only the worker
 * process ever opens it.
 */
export function createWorkerConnection(): IORedis {
  return connect('worker', { maxRetriesPerRequest: null });
}

if (!queueEnabled) {
  logger.info('REDIS_URL not set — background job queue is disabled; jobs will not be enqueued.');
}

/** Reachability check for the readiness endpoint — never throws, answers within `timeoutMs`. */
export async function checkQueueRedis(timeoutMs = 2000): Promise<'ok' | 'unreachable' | 'disabled'> {
  if (!queueEnabled) return 'disabled';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<'unreachable'>((resolve) => {
    timer = setTimeout(() => resolve('unreachable'), timeoutMs);
  });
  try {
    return await Promise.race([queueConnection!.ping().then(() => 'ok' as const), timedOut]);
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}
