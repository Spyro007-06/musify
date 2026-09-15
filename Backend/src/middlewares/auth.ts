import { Request, Response, NextFunction } from 'express';
import { prisma } from '@config/database';
import { ApiError } from '@utils/ApiError';
import { ERROR_MESSAGES } from '@constants/messages';
import { Permission, ROLE_PERMISSIONS } from '@constants/roles';
import jwt from 'jsonwebtoken';
import { env } from '@config/env';

/**
 * Middleware to enforce authentication via Supabase JWT Bearer Token.
 * Validates the token against Supabase and attaches the user to req.user.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.substring(7);

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET);
    } catch (err) {
      throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    if (!decoded.sub) {
      throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Fetch the matching public profile row
    const user = await prisma.user.findUnique({
      where: { supabaseId: decoded.sub, deletedAt: null },
    });

    if (!user) {
      throw ApiError.unauthorized(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (!user.isActive) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_INACTIVE);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware.
 * If a valid Supabase token is provided, attaches user to req.user.
 * If token is missing or invalid, proceeds silently without throwing.
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(token, env.SUPABASE_JWT_SECRET);

        if (decoded.sub) {
          const user = await prisma.user.findUnique({
            where: { supabaseId: decoded.sub, deletedAt: null },
          });

          if (user && user.isActive) {
            req.user = user;
          }
        }
      } catch {
        // Silent catch for invalid/expired tokens in optional auth
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if the authenticated user has the required permission.
 * MUST be placed after the authenticate middleware.
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
      }

      const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
      if (!userPermissions.includes(permission)) {
        throw ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
