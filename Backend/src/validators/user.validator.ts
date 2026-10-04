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
  // A calendar month, up to the current one.
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM')
    .refine((m) => m <= new Date().toISOString().slice(0, 7), 'month is in the future')
    .optional(),
});
