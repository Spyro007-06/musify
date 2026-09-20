import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@services/auth.service';
import { signupSchema, loginSchema } from '@validators/auth.validator';
import { sendSuccess } from '@utils/ApiResponse';
import { HTTP_STATUS } from '@constants/httpCodes';
import { SUCCESS_MESSAGES } from '@constants/messages';
import { AuthenticatedRequest } from '@/types/express';

const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setSessionCookie(res: Response, refreshToken: string): void {
  // See the matching comment on the CSRF cookie in app.ts: the frontend
  // proxies /api/* to this backend via Next.js rewrites, so requests are
  // same-origin and 'strict' is correct (and safer than 'none').
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
}

export class AuthController {
  public static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = signupSchema.parse(req.body);
      const result = await AuthService.signup(validatedData);

      if (result.session?.refresh_token) {
        setSessionCookie(res, result.session.refresh_token);
      }

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.CREATED,
        message: SUCCESS_MESSAGES.SIGNUP_SUCCESS,
        data: {
          user: result.user,
          accessToken: result.session?.access_token,
          expiresIn: result.session?.expires_in,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, username, password } = loginSchema.parse(req.body);
      const emailOrUsername = email || username || '';

      const result = await AuthService.login(emailOrUsername, password);

      if (result.session?.refresh_token) {
        setSessionCookie(res, result.session.refresh_token);
      }

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
        data: {
          user: result.user,
          accessToken: result.session?.access_token,
          expiresIn: result.session?.expires_in,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accessToken =
        req.headers.authorization?.substring(7) ||
        req.body.accessToken;

      if (accessToken) {
        await AuthService.logout(accessToken);
      }

      res.clearCookie('refreshToken');

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken =
        req.body.refreshToken || req.cookies?.refreshToken;

      if (!refreshToken) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Refresh token is required' });
        return;
      }

      const result = await AuthService.refresh(refreshToken);

      if (result.session?.refresh_token) {
        setSessionCookie(res, result.session.refresh_token);
      }

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: SUCCESS_MESSAGES.TOKEN_REFRESHED,
        data: {
          accessToken: result.accessToken,
          expiresIn: result.session?.expires_in,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      // req.user is the public profile row; supabaseId links it to auth.users
      const user = await AuthService.getProfile(authenticatedReq.user.supabaseId);

      sendSuccess({
        res,
        statusCode: HTTP_STATUS.OK,
        message: 'Profile retrieved successfully.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
