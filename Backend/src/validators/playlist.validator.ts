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

export const reorderTracksSchema = z.object({
  trackIds: z.array(z.string().min(1)).max(5000),
});

export const addTrackSchema = z.object({
  trackId: z.string().min(1, 'Track ID is required'),
});


export const importSpotifySchema = z.object({
  url: z.string().trim().min(1, 'Playlist link is required').max(1000),
  /** Add the songs to this playlist of the user's instead of creating a new one. */
  playlistId: z.string().trim().min(1).max(100).optional(),
});

/** One batch for POST /playlists/:id/import/songs — small, so each request stays short. */
export const IMPORT_BATCH_MAX = 25;
export const importSongsSchema = z
  .object({
    spotifyIds: z.array(z.string().regex(/^[A-Za-z0-9]{22}$/, 'Invalid Spotify track id')).default([]),
    songs: z
      .array(z.object({ title: z.string().trim().min(1).max(200), artist: z.string().trim().max(200).default('') }))
      .default([]),
  })
  .refine((b) => {
    const n = b.spotifyIds.length + b.songs.length;
    return n > 0 && n <= IMPORT_BATCH_MAX;
  }, `Send between 1 and ${IMPORT_BATCH_MAX} songs at a time.`);

const screenshotImage = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  // base64; ~6M chars ≈ a 4.5MB image (the client downsizes well below that;
  // the route's 8mb body limit caps a whole batch)
  data: z.string().min(1).max(6_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Invalid image data'),
});

/** Up to this many images per Gemini call: each call counts against its per-minute quota. */
export const SCREENSHOT_BATCH_MAX = 4;

// { images: [...] }, or one image as { mimeType, data } (what older clients send).
export const importScreenshotSchema = z.union([
  z.object({ images: z.array(screenshotImage).min(1).max(SCREENSHOT_BATCH_MAX) }).transform((b) => b.images),
  screenshotImage.transform((image) => [image]),
]);
