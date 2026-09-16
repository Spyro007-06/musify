export type UserRole = 'USER' | 'ARTIST' | 'ADMIN' | 'SUPERADMIN';

export interface UserPreferences {
  id?: string;
  userId?: string;
  favouriteLanguages?: string[];
  favouriteAlbums?: string[];
  favouriteArtists?: string[];
  favouriteGenres?: string[];
  favouriteMoods?: string[];
}

export interface User {
  id: string;
  supabaseId?: string;
  email?: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  role?: UserRole;
  isVerified?: boolean;
  isActive?: boolean;
  isPremium?: boolean;
  premiumUntil?: string | null;
  userPreferences?: UserPreferences | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}
