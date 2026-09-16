import { Request, Response, NextFunction } from 'express';
import { prisma } from '@config/database';
import { supabase } from '@config/supabase';
import { ApiError } from '@utils/ApiError';
import { ERROR_MESSAGES } from '@constants/messages';
import { Permission, ROLE_PERMISSIONS } from '@constants/roles';

/**
 * Verifies a bearer token against Supabase and returns its claims' `sub`
 * (the Supabase user id), or null if the token is missing/invalid/expired.
 *
 * Uses supabase.auth.getClaims() rather than manually verifying with a
 * shared secret: this project's Supabase Auth signs access tokens with an
 * asymmetric key (ES256, distributed via the project's JWKS endpoint), not
 * a symmetric HS256 secret, so `jwt.verify(token, SUPABASE_JWT_SECRET)`
 * would never validate a real token. getClaims() verifies locally against
 * the (internally cached) JWKS for asymmetric-signing projects, and
 * transparently falls back to a Supabase Auth server call for projects
 * still using a symmetric secret — so this one path is correct regardless
 * of which signing mode the project is in, without us tracking that
 * ourselves or maintaining two verification schemes.
 */
async function verifySupabaseToken(token: string): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return null;
  }
  return data.claims.sub;
}

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
    const supabaseId = await verifySupabaseToken(token);

    if (!supabaseId) {
      throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Fetch the matching public profile row
    const user = await prisma.user.findUnique({
      where: { supabaseId, deletedAt: null },
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
      const supabaseId = await verifySupabaseToken(token);

      if (supabaseId) {
        const user = await prisma.user.findUnique({
          where: { supabaseId, deletedAt: null },
        });

        if (user && user.isActive) {
          req.user = user;
        }
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
