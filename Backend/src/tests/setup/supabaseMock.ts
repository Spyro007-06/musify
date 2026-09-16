/**
 * Mocks the Supabase clients so auth tests never make a real network call.
 * Registered as a global `setupFilesAfterEnv` entry (see jest.config.ts).
 * A test configures behavior via the exported jest.fn()s, e.g.:
 *   supabaseAdminAuthMock.createUser.mockResolvedValue({ data: {...}, error: null });
 *
 * getClaims() has a real default implementation (not a bare jest.fn()):
 * it decodes (not cryptographically verifies) the bearer token and returns
 * its payload as `claims`, matching the shape `authenticate`/
 * `optionalAuthenticate` (src/middlewares/auth.ts) expect from the real
 * supabase.auth.getClaims(). This lets every existing test keep minting
 * tokens with `jwt.sign({ sub: ... }, anySecret)` unchanged — the secret's
 * value is irrelevant here since we only decode, never verify, matching
 * what's actually being unit-tested (our own middleware/route logic, not
 * Supabase's cryptography). A test can still override this per-call with
 * `supabaseAuthMock.getClaims.mockResolvedValueOnce(...)` to simulate a
 * rejected/expired token.
 */
import jwt from 'jsonwebtoken';

const defaultGetClaims = jest.fn(async (token?: string) => {
  const decoded = token ? (jwt.decode(token) as Record<string, unknown> | null) : null;
  if (!decoded || !decoded.sub) {
    return { data: null, error: new Error('invalid or missing token') };
  }
  return {
    data: { claims: decoded, header: { alg: 'ES256', typ: 'JWT' }, signature: new Uint8Array() },
    error: null,
  };
});

jest.mock('@config/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      refreshSession: jest.fn(),
      getClaims: jest.fn(),
    },
  },
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: jest.fn(),
        signOut: jest.fn(),
      },
    },
  },
}));

const { supabase, supabaseAdmin } = require('@config/supabase');

export const supabaseAuthMock = supabase.auth as {
  signInWithPassword: jest.Mock;
  refreshSession: jest.Mock;
  getClaims: jest.Mock;
};

export const supabaseAdminAuthMock = supabaseAdmin.auth.admin as {
  createUser: jest.Mock;
  signOut: jest.Mock;
};

beforeEach(() => {
  supabaseAuthMock.signInWithPassword.mockReset();
  supabaseAuthMock.refreshSession.mockReset();
  supabaseAuthMock.getClaims.mockReset();
  supabaseAuthMock.getClaims.mockImplementation(defaultGetClaims);
  supabaseAdminAuthMock.createUser.mockReset();
  supabaseAdminAuthMock.signOut.mockReset();
});
