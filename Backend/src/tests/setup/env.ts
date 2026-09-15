/**
 * Runs before any test module loads (see jest.config.ts `setupFiles`).
 * Populates just enough env to satisfy `src/config/env.ts`'s zod validation —
 * these are never used for a real network call, since Prisma and Supabase
 * are mocked in every test (see src/tests/setup/prismaMock.ts,
 * src/tests/setup/supabaseMock.ts).
 */
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.local';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-not-for-real-use';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.CSRF_SECRET = 'test-csrf-secret';
process.env.RATE_LIMIT_MAX = '10000';
process.env.AUTH_RATE_LIMIT_MAX = '10000';
process.env.SWAGGER_ENABLED = 'false';
