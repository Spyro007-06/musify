import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  favouriteGenres: z.array(z.string()).optional(),
  favouriteArtists: z.array(z.string()).optional(),
  favouriteLanguages: z.array(z.string()).optional(),
  favouriteAlbums: z.array(z.string()).optional(),
  favouriteMoods: z.array(z.string()).optional(),
});

export const logPlayHistorySchema = z.object({
  spotifyTrackId: z.string().min(1),
  albumId: z.string().optional(),
  artistId: z.string().optional(),
  genre: z.string().optional(),
  device: z.string().optional(),
  sessionDuration: z.number().nonnegative().optional(),
  listenPercentage: z.number().min(0).max(100).optional(),
  completedSong: z.boolean().optional(),
  numberOfReplays: z.number().int().nonnegative().optional(),
});

export const logLikeSchema = z.object({
  targetId: z.string().min(1),
  type: z.enum(['song', 'album', 'artist']).optional().default('song'),
});

export const logDislikeSchema = z.object({
  trackId: z.string().min(1),
});

export const logSkipSchema = z.object({
  trackId: z.string().min(1),
  skipTime: z.number().nonnegative().optional(),
  duration: z.number().positive().optional(),
});

export const logFeedbackSchema = z.object({
  trackId: z.string().min(1),
  action: z.enum(['complete', 'skip', 'replay']),
  duration: z.number().positive().optional(),
  skipTime: z.number().nonnegative().optional(),
});

export const smartQueueSchema = z.object({
  trackId: z.string().min(1),
  artistName: z.string().min(1),
  genre: z.string().optional(),
  mood: z.string().optional(),
});
