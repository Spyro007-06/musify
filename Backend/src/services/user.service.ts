import { prisma } from '@config/database';
import { ApiError } from '@utils/ApiError';
import { IUser } from '@interfaces/IUser';

export class UserService {
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

  public static async getUserProfile(userId: string): Promise<IUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return this.formatUser(user);
  }

  public static async updateUserProfile(
    userId: string,
    data: { displayName?: string; avatarUrl?: string; bio?: string }
  ): Promise<IUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
      },
    });
    return this.formatUser(user);
  }
}
