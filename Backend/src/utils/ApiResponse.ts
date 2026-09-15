import { Response } from 'express';
import { HTTP_STATUS, HttpStatus } from '@constants/httpCodes';

interface SuccessPayload<T> {
  res: Response;
  statusCode?: HttpStatus;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

interface ErrorPayload {
  res: Response;
  statusCode?: HttpStatus;
  message: string;
  errors?: Array<{ field?: string; message: string }>;
}

/**
 * Send a standardized success response.
 * Shape: { success: true, message, data?, meta? }
 */
export const sendSuccess = <T>({
  res,
  statusCode = HTTP_STATUS.OK,
  message,
  data,
  meta,
}: SuccessPayload<T>): Response => {
  const body: Record<string, unknown> = { success: true, message };
  if (data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
};

/**
 * Send a standardized error response.
 * Shape: { success: false, message, errors? }
 */
export const sendError = ({
  res,
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  message,
  errors,
}: ErrorPayload): Response => {
  const body: Record<string, unknown> = { success: false, message };
  if (errors && errors.length > 0) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Paginated success response.
 * Shape: { success: true, message, data, meta: { page, limit, total, totalPages, ... } }
 */
export const sendPaginated = <T>({
  res,
  message,
  data,
  page,
  limit,
  total,
}: {
  res: Response;
  message: string;
  data: T[];
  page: number;
  limit: number;
  total: number;
}): Response => {
  const totalPages = Math.ceil(total / limit);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

