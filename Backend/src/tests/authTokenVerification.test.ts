/**
 * Exercises the REAL @supabase/supabase-js verification path (not the
 * jest.mock('@config/supabase', ...) stand-in from src/tests/setup/
 * supabaseMock.ts — this file imports createClient directly from
 * @supabase/supabase-js, a different module path, so that mock never
 * applies here) against a mocked JWKS response, to prove that
 * supabase.auth.getClaims() — what src/middlewares/auth.ts now calls —
 * actually validates real ES256 signatures instead of trusting a shared
 * secret.
 *
 * Background: this project's live Supabase instance signs access tokens
 * with an asymmetric ES256 key distributed via
 * https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json, not a
 * symmetric HS256 secret. The old `jwt.verify(token, SUPABASE_JWT_SECRET)`
 * in auth.ts could never validate a real token from this project.
 */
import { createClient } from '@supabase/supabase-js';
import { generateKeyPairSync, createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';

const PROJECT_URL = 'https://test-project.supabase.co';
const KID = 'test-signing-key-1';

const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// A second, unrelated keypair — used to sign a token whose payload/header
// look legitimate but whose signature was produced by the wrong key.
const { privateKey: wrongPrivateKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const publicJwk = createPublicKey(publicKey).export({ format: 'jwk' }) as {
  kty: string;
  crv: string;
  x: string;
  y: string;
};

const jwks = {
  keys: [
    {
      ...publicJwk,
      kid: KID,
      alg: 'ES256',
      use: 'sig',
      key_ops: ['verify'],
    },
  ],
};

function signToken(
  payload: Record<string, unknown>,
  signingKey: string,
  overrides: { kid?: string; expiresIn?: number | string } = {}
) {
  return jwt.sign(payload, signingKey, {
    algorithm: 'ES256',
    keyid: overrides.kid ?? KID,
    expiresIn: overrides.expiresIn ?? '1h',
  });
}

/** Mimics fetch just enough for auth-js's internal `_request` helper. */
function fakeFetch(jwksResponse: unknown = jwks, jwksStatus = 200) {
  return jest.fn(async (input: unknown) => {
    const url = typeof input === 'string' ? input : (input as { url: string }).url;
    if (url.endsWith('/.well-known/jwks.json')) {
      return {
        ok: jwksStatus >= 200 && jwksStatus < 300,
        status: jwksStatus,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => jwksResponse,
        text: async () => JSON.stringify(jwksResponse),
      } as unknown as Response;
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
}

function makeClient(fetchImpl: ReturnType<typeof fakeFetch>) {
  return createClient(PROJECT_URL, 'test-anon-key', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetchImpl as unknown as typeof fetch },
  });
}

describe('supabase.auth.getClaims() against a real ES256 JWKS (real auth-js, mocked network)', () => {
  it('accepts a validly-signed token and returns its claims', async () => {
    const client = makeClient(fakeFetch());
    const token = signToken({ sub: 'user-abc', aud: 'authenticated', role: 'authenticated' }, privateKey);

    const { data, error } = await client.auth.getClaims(token);

    expect(error).toBeNull();
    expect(data?.claims.sub).toBe('user-abc');
    expect(data?.header.alg).toBe('ES256');
  });

  it('rejects a token signed by the wrong private key (bad signature)', async () => {
    const client = makeClient(fakeFetch());
    // Same kid/header as a real token, but signed with a key that doesn't
    // match the public key published in the JWKS — i.e. a forged token.
    const token = signToken({ sub: 'user-abc', aud: 'authenticated', role: 'authenticated' }, wrongPrivateKey);

    const { data, error } = await client.auth.getClaims(token);

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it('rejects an expired token', async () => {
    const client = makeClient(fakeFetch());
    const token = signToken(
      { sub: 'user-abc', aud: 'authenticated', role: 'authenticated' },
      privateKey,
      { expiresIn: -60 }
    );

    const { data, error } = await client.auth.getClaims(token);

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it('rejects a malformed token', async () => {
    const client = makeClient(fakeFetch());

    const { data, error } = await client.auth.getClaims('not-a-real-jwt');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});
