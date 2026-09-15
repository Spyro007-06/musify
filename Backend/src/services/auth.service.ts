import { supabase, supabaseAdmin } from '@config/supabase';
import { prisma } from '@config/database';
import { ApiError } from '@utils/ApiError';
import { ERROR_MESSAGES } from '@constants/messages';
import { IUser } from '@interfaces/IUser';
import { signupSchema } from '@validators/auth.validator';
import { z } from 'zod';

type SignupInput = z.infer<typeof signupSchema>;

export class AuthService {
  /**
   * Format a public users table row into the IUser interface
   */
  private static formatUser(user: any): IUser {
    return {
      id: user.id,
      supabaseId: user.supabaseId,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      isPremium: user.isPremium,
      premiumUntil: user.premiumUntil,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  /**
   * Sign up: creates a Supabase Auth user, then inserts a profile row.
   */
  public static async signup(input: SignupInput): Promise<{ user: IUser; session: any }> {
    // Check if email already exists in our public users table
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw ApiError.conflict(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    // Check if username already exists in our public users table
    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existingUsername) {
      throw ApiError.conflict(ERROR_MESSAGES.USERNAME_ALREADY_EXISTS);
    }

    // Create the auth user in Supabase Auth (handles email uniqueness + password hashing)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true, // auto-confirm for now; set false to require email verification
      user_metadata: {
        username: input.username,
        displayName: input.displayName || input.username,
        role: input.role,
      },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered')) {
        throw ApiError.conflict(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      }
      throw ApiError.internal(authError.message);
    }

    const supabaseUid = authData.user!.id;

    // Insert public profile row linked to Supabase Auth UID
    const user = await prisma.user.create({
      data: {
        supabaseId: supabaseUid,
        email: input.email,
        username: input.username,
        displayName: input.displayName || input.username,
        role: input.role,
        isVerified: true,
        isActive: true,
      },
    });

    // Sign the user in to get a session/tokens
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (sessionError) {
      throw ApiError.internal(sessionError.message);
    }

    return {
      user: this.formatUser(user),
      session: sessionData.session,
    };
  }

  /**
   * Login with email or username + password.
   * Supabase Auth only supports email login natively, so we resolve username → email first.
   */
  public static async login(emailOrUsername: string, password: string): Promise<{ user: IUser; session: any }> {
    let email = emailOrUsername;

    // If the input doesn't look like an email, look up the email by username
    if (!emailOrUsername.includes('@')) {
      const found = await prisma.user.findUnique({
        where: { username: emailOrUsername },
        select: { email: true, isActive: true, deletedAt: true },
      });
      if (!found || found.deletedAt) {
        throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
      }
      if (!found.isActive) {
        throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_INACTIVE);
      }
      email = found.email;
    }

    // Authenticate via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Fetch public profile
    const user = await prisma.user.findUnique({
      where: { supabaseId: data.user.id, deletedAt: null },
    });

    if (!user) {
      throw ApiError.unauthorized(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (!user.isActive) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_INACTIVE);
    }

    return {
      user: this.formatUser(user),
      session: data.session,
    };
  }

  /**
   * Logout: invalidates the Supabase session.
   * Requires the user's access token to sign out from Supabase's side.
   */
  public static async logout(accessToken: string): Promise<void> {
    // Sign out the user by revoking their token in Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.signOut(accessToken);

    if (error) {
      // Non-fatal — token may already be expired
      console.warn('Supabase signOut warning:', error.message);
    }
  }

  /**
   * Refresh session using a Supabase refresh token.
   */
  public static async refresh(refreshToken: string): Promise<{ accessToken: string; session: any }> {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      throw ApiError.unauthorized(ERROR_MESSAGES.REFRESH_TOKEN_INVALID);
    }

    return {
      accessToken: data.session.access_token,
      session: data.session,
    };
  }

  /**
   * Get current user profile by their Supabase UID (from the verified JWT payload).
   */
  public static async getProfile(supabaseId: string): Promise<IUser> {
    const user = await prisma.user.findUnique({
      where: { supabaseId, deletedAt: null },
    });

    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return this.formatUser(user);
  }
}
