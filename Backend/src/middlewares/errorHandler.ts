import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '@utils/ApiError';
import { sendError } from '@utils/ApiResponse';
import { logError } from '@utils/logger';
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

  // 5. Unknown/programming errors — log and return 500
  logError(err, { url: req.originalUrl, method: req.method });

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

