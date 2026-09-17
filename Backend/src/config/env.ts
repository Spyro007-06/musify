import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  APP_NAME: z.string().default('Musify'),
  APP_URL: z.string().default('http://localhost:3001'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  API_PREFIX: z.string().default('/api'),

  // Supabase
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Database (Prisma direct connection to Supabase Postgres)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  AUTH_RATE_LIMIT_MAX: z.string().default('10').transform(Number),

  // Security
  CSRF_SECRET: z.string().default('super-secret-csrf-key-for-dev-only'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_DIR: z.string().default('./logs'),

  // Swagger
  SWAGGER_ENABLED: z.string().default('true').transform((v) => v === 'true'),

  // Pagination
  DEFAULT_PAGE_SIZE: z.string().default('20').transform(Number),
  MAX_PAGE_SIZE: z.string().default('100').transform(Number),

  // Error tracking (optional — Sentry is disabled entirely if unset)
  SENTRY_DSN: z.string().optional(),

  // AI lyrics analysis (optional — analyzeLyrics throws a clear
  // LLMUpstreamError, not a fake result, if unset)
  GEMINI_API_KEY: z.string().optional(),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  parseResult.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parseResult.data;
export type Env = typeof env;
