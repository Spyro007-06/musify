import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().optional(),
  // ADMIN/SUPERADMIN are never selectable at public signup — only USER/ARTIST.
  // Elevating a user to ADMIN/SUPERADMIN must go through a separate admin-only action.
  role: z.enum(['USER', 'ARTIST']).optional().default('USER'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

