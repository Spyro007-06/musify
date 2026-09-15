import rateLimit from 'express-rate-limit';
import { env } from '@config/env';

/**
 * Global API Rate Limiter
 * Applied to all routes to prevent generic spam or DDoS.
 */
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl.includes('/health'),
});

/**
 * Strict Auth Rate Limiter
 * Applied to sensitive endpoints like /login and /signup to prevent brute force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
