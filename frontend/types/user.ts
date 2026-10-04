import { Track } from './track';

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

export interface LogPlayHistoryPayload {
  trackId: string;
  albumId?: string;
  artistId?: string;
  genre?: string;
  device?: string;
  sessionDuration?: number;
  listenPercentage?: number;
  completedSong?: boolean;
  numberOfReplays?: number;
}

export interface LogLikePayload {
  targetId: string;
  type?: 'song' | 'album' | 'artist';
}

export interface LogDislikePayload {
  trackId: string;
}

export interface LogSkipPayload {
  trackId: string;
  skipTime?: number;
  duration?: number;
}

/** A month of listening (GET /user/stats). */
export interface ListeningStats {
  month: string; // YYYY-MM
  minutesListened: number;
  plays: number;
  skips: number;
  uniqueTracks: number;
  uniqueArtists: number;
  topTracks: { track: Track; plays: number }[];
  topArtists: { id: string; name: string; image: string | null; plays: number }[];
  topLanguages: { name: string; plays: number }[];
}

/** Ids of lib/constants/moods.ts's MOODS (the backend accepts only these). */
export type MoodId = 'chill' | 'focus' | 'workout' | 'party' | 'sleep' | 'romance';
