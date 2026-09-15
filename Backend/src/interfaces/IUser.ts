import { Role } from '@constants/roles';

export interface IUser {
  id: string;
  supabaseId: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: Role;
  isVerified: boolean;
  isActive: boolean;
  isPremium: boolean;
  premiumUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IUserPublic {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isPremium: boolean;
}


