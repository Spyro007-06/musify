/**
 * Mocks the Supabase clients so auth tests never make a real network call.
 * Registered as a global `setupFilesAfterEnv` entry (see jest.config.ts).
 * A test configures behavior via the exported jest.fn()s, e.g.:
 *   supabaseAdminAuthMock.createUser.mockResolvedValue({ data: {...}, error: null });
 */
jest.mock('@config/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      refreshSession: jest.fn(),
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
};

export const supabaseAdminAuthMock = supabaseAdmin.auth.admin as {
  createUser: jest.Mock;
  signOut: jest.Mock;
};

beforeEach(() => {
  supabaseAuthMock.signInWithPassword.mockReset();
  supabaseAuthMock.refreshSession.mockReset();
  supabaseAdminAuthMock.createUser.mockReset();
  supabaseAdminAuthMock.signOut.mockReset();
});
