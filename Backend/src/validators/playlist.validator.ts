import { z } from 'zod';

export const createPlaylistSchema = z.object({
  title: z.string().max(100, 'Title must be under 100 characters').optional(),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
  coverUrl: z.string().url('Invalid cover URL').optional(),
  isPublic: z.boolean().optional().default(true),
  albumId: z.string().optional(),
}).refine(data => data.title || data.albumId, {
  message: "Either title or albumId must be provided",
  path: ["title"]
});

export const updatePlaylistSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be under 100 characters').optional(),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
  coverUrl: z.string().url('Invalid cover URL').optional(),
  isPublic: z.boolean().optional(),
});

export const addTrackSchema = z.object({
  trackId: z.string().min(1, 'Track ID is required'),
});

