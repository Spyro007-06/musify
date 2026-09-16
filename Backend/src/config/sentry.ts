import * as Sentry from '@sentry/node';
import { env } from './env';
import { logger } from '@utils/logger';

export const sentryEnabled = Boolean(env.SENTRY_DSN);

/**
 * Sentry is entirely opt-in — with no SENTRY_DSN configured, this is a
 * no-op and the app behaves exactly as before. Call once at process
 * startup, before anything that might throw.
 */
export function initSentry(): void {
  if (!sentryEnabled) {
    if (env.NODE_ENV === 'production') {
      logger.warn(
        '⚠️ Booting in production without SENTRY_DSN set — errors will ONLY be visible in local log files, not tracked or alerted on. Set SENTRY_DSN before this reaches real traffic.'
      );
    } else {
      logger.info('Sentry DSN not configured — error tracking disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0,
  });

  logger.info('Sentry error tracking initialized.');
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!sentryEnabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
