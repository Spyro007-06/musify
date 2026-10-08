import { z } from 'zod';
import { MOODS } from '@constants/moods';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
});

export const moodCheckInSchema = z.object({
  mood: z.enum(MOODS),
});

export const statsQuerySchema = z.object({
  // A calendar month, up to the current one (somewhere: UTC+14 is the first to start a month).
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM')
    .refine((m) => m <= new Date(Date.now() + 14 * 3600_000).toISOString().slice(0, 7), 'month is in the future')
    .optional(),
  // The listener's time zone, in minutes east of UTC (India: 330), so months start at their midnight.
  tzOffset: z.coerce.number().int().min(-720).max(840).optional(),
});
