import { Request, Response, NextFunction } from 'express';
import { logRequest } from '@utils/logger';

/**
 * HTTP request/response logger middleware.
 * Logs method, URL, status code, duration, and user id (if authenticated).
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = (req as Request & { user?: { id: string } }).user?.id;
    logRequest(req.method, req.originalUrl, res.statusCode, duration, userId);
  });

  next();
};

