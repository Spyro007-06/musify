import { z } from 'zod';

export const warmMusicMetadataCacheSchema = z.object({
  trackIds: z.array(z.string().min(1)).min(1).max(200),
});
