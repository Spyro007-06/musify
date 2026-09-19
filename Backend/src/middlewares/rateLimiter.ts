import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Ratelimit } from '@upstash/ratelimit';
import { env } from '@config/env';
import { redis, redisEnabled } from '@config/redis';

function formatRetryAfter(seconds: number): string {
  if (seconds < 90) return `${seconds}s`;
  return `${Math.ceil(seconds / 60)} min`;
}

// express-rate-limit's standardHeaders sets RateLimit-Reset to seconds-until-reset already.
function retryAfterFrom(res: Response): number {
  const header = res.getHeader('RateLimit-Reset');
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000);
}

/**
 * Upstash-backed limiter, used when Redis is configured. Unlike
 * express-rate-limit's default in-memory store, this is shared across
 * every server instance and survives restarts/deploys — the actual reason
 * to reach for it over the in-memory version.
 */
function createUpstashLimiter(
  prefix: string,
  max: number,
  windowMs: number,
  message: string,
  skip?: (req: Request) => boolean
) {
  const ratelimit = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
    // Without a distinct prefix per limiter, @upstash/ratelimit defaults to
    // the same key namespace for every instance — globalLimiter and
    // authLimiter would silently share one counter per IP, so ordinary
    // browsing (which hits globalLimiter on every request) would burn
    // through authLimiter's much stricter budget too.
    prefix: `ratelimit:${prefix}`,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    if (skip?.(req)) {
      next();
      return;
    }
    const identifier = req.ip || 'anonymous';
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    res.setHeader('RateLimit-Limit', limit.toString());
    res.setHeader('RateLimit-Remaining', remaining.toString());
    res.setHeader('RateLimit-Reset', reset.toString());

    if (!success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds.toString());
      res.status(429).json({
        success: false,
        message: `${message} Try again in ${formatRetryAfter(retryAfterSeconds)}.`,
        retryAfterSeconds,
      });
      return;
    }
    next();
  };
}

/**
 * Global API Rate Limiter
 * Applied to all routes to prevent generic spam or DDoS.
 */
export const globalLimiter = redisEnabled
  ? createUpstashLimiter(
      'global',
      env.RATE_LIMIT_MAX,
      env.RATE_LIMIT_WINDOW_MS,
      'Too many requests, please try again later.',
      (req) => req.originalUrl.includes('/health')
    )
  : rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      message: (req: Request, res: Response) => ({
        success: false,
        message: `Too many requests, please try again later. Try again in ${formatRetryAfter(retryAfterFrom(res))}.`,
      }),
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.originalUrl.includes('/health'),
    });

/**
 * Strict Auth Rate Limiter
 * Applied to sensitive endpoints like /login and /signup to prevent brute force attacks.
 */
export const authLimiter = redisEnabled
  ? createUpstashLimiter(
      'auth',
      env.AUTH_RATE_LIMIT_MAX,
      env.RATE_LIMIT_WINDOW_MS,
      'Too many authentication attempts, please try again later.'
    )
  : rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.AUTH_RATE_LIMIT_MAX,
      message: (req: Request, res: Response) => ({
        success: false,
        message: `Too many authentication attempts, please try again later. Try again in ${formatRetryAfter(retryAfterFrom(res))}.`,
      }),
      standardHeaders: true,
      legacyHeaders: false,
    });
