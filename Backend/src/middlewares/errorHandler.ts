import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '@utils/ApiError';
import { SaavnUpstreamError } from '@utils/SaavnUpstreamError';
import { ClaudeUpstreamError } from '@utils/ClaudeUpstreamError';
import { sendError } from '@utils/ApiResponse';
import { logger, logError } from '@utils/logger';
import { captureException } from '@config/sentry';
import { env } from '@config/env';
import { HTTP_STATUS } from '@constants/httpCodes';
import { ERROR_MESSAGES } from '@constants/messages';
import { Prisma } from '@prisma/client';

/**
 * Centralized error handler — the last middleware in the Express chain.
 * Normalizes all errors into the standard API response envelope.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  // 1. Known operational error (ApiError)
  if (err instanceof ApiError) {
    sendError({
      res,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors.length > 0 ? err.errors : undefined,
    });
    return;
  }

  // 2. Zod validation error (should be caught by validate middleware, but just in case)
  if (err instanceof ZodError) {
    sendError({
      res,
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }

  // 3. Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint violation
      const fields = (err.meta?.target as string[])?.join(', ') || 'field';
      sendError({
        res,
        statusCode: HTTP_STATUS.CONFLICT,
        message: `A record with this ${fields} already exists.`,
      });
      return;
    }
    if (err.code === 'P2025') {
      // Record not found
      sendError({
        res,
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: ERROR_MESSAGES.NOT_FOUND,
      });
      return;
    }
  }

  // 4. Supabase/JWT auth errors (fallback — normally caught in auth middleware)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    sendError({
      res,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: ERROR_MESSAGES.INVALID_TOKEN,
    });
    return;
  }

  // 5. CSRF token errors (csrf-csrf, thrown as an http-errors instance with code EBADCSRFTOKEN)
  if ((err as { code?: string }).code === 'EBADCSRFTOKEN') {
    sendError({
      res,
      statusCode: HTTP_STATUS.FORBIDDEN,
      message: 'Invalid or missing CSRF token.',
    });
    return;
  }

  // 6. JioSaavn (external catalog) is down/degraded — this is an expected,
  // operational failure mode of a third-party dependency, not a bug in our
  // code, so it gets its own status (not 404 "not found", not a Sentry-
  // reported 500) and its own log line for on-call to distinguish "upstream
  // is having a bad day" from "we broke something".
  if (err instanceof SaavnUpstreamError) {
    logger.warn(`Saavn upstream failure: ${err.message}`, {
      url: req.originalUrl,
      method: req.method,
      cause: err.cause instanceof Error ? err.cause.message : err.cause,
    });
    sendError({
      res,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      message: 'Music catalog is temporarily unavailable. Please try again shortly.',
    });
    return;
  }

  // 6b. Claude (lyrics analysis) is down/degraded/misconfigured — same
  // treatment as SaavnUpstreamError: an expected operational failure of a
  // third-party dependency, not a bug in our code.
  if (err instanceof ClaudeUpstreamError) {
    logger.warn(`Claude upstream failure: ${err.message}`, {
      url: req.originalUrl,
      method: req.method,
      cause: err.cause instanceof Error ? err.cause.message : err.cause,
    });
    sendError({
      res,
      statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE,
      message: 'Lyrics analysis is temporarily unavailable. Please try again shortly.',
    });
    return;
  }

  // 7. Unknown/programming errors — log, report, and return 500
  logError(err, { url: req.originalUrl, method: req.method });
  captureException(err, { url: req.originalUrl, method: req.method });

  sendError({
    res,
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message:
      env.NODE_ENV === 'production'
        ? ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        : err.message,
    errors:
      env.NODE_ENV !== 'production'
        ? [{ message: err.stack || err.message }]
        : undefined,
  });
};

/**
 * 404 handler — catch all unmatched routes.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  sendError({
    res,
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
};

