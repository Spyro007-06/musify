import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

interface RequestContext {
  requestId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Assigns a request id (reusing an inbound `x-request-id` if a proxy/client
 * already set one, so traces survive across services) and makes it
 * available to every log line for the lifetime of the request via
 * AsyncLocalStorage — no need to thread `req` through every function call.
 * Must be registered before any other middleware that logs.
 */
export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  res.setHeader('x-request-id', requestId);
  asyncLocalStorage.run({ requestId }, next);
};

/** Read the current request's id from anywhere in the call stack (e.g. the logger). */
export function getRequestId(): string | undefined {
  return asyncLocalStorage.getStore()?.requestId;
}
