import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { sendError } from '@utils/ApiResponse';
import { HTTP_STATUS } from '@constants/httpCodes';
import { ERROR_MESSAGES } from '@constants/messages';

type ValidateTarget = 'body' | 'query' | 'params' | 'headers';

/**
 * Middleware factory for validating request data with a Zod schema.
 * Validates body by default. Pass target to validate query, params, or headers.
 */
export const validate =
  (schema: ZodSchema, target: ValidateTarget = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = (result.error as ZodError).issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      sendError({
        res,
        statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        errors,
      });
      return;
    }

    // Attach parsed (coerced/transformed) data back to request
    (req as unknown as Record<string, any>)[target] = result.data;
    next();
  };

/**
 * Validate multiple parts of the request in one middleware.
 */
export const validateRequest =
  (schemas: Partial<Record<ValidateTarget, ZodSchema>>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: Array<{ field: string; message: string }> = [];

    for (const [target, schema] of Object.entries(schemas) as [ValidateTarget, ZodSchema][]) {
      if (!schema) continue;
      const result = schema.safeParse(req[target]);
      if (!result.success) {
        const errors = (result.error as ZodError).issues.map((issue) => ({
          field: `${target}.${issue.path.join('.')}`,
          message: issue.message,
        }));
        allErrors.push(...errors);
      } else {
        (req as unknown as Record<string, any>)[target] = result.data;
      }
    }

    if (allErrors.length > 0) {
      sendError({
        res,
        statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        message: ERROR_MESSAGES.VALIDATION_ERROR,
        errors: allErrors,
      });
      return;
    }

    next();
  };

