import { getRateLimitIdentifier } from '@middlewares/rateLimiter';
import { Request } from 'express';

function makeRequest(overrides: Partial<Request>): Request {
  return { ip: '127.0.0.1', headers: {}, ...overrides } as Request;
}

function bearerFor(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `Bearer ${header}.${body}.signature`;
}

describe('getRateLimitIdentifier', () => {
  it('keys by user when the request carries a Bearer token with a sub claim', () => {
    const req = makeRequest({ headers: { authorization: bearerFor({ sub: 'user-123' }) } });
    expect(getRateLimitIdentifier(req)).toBe('user:user-123');
  });

  it('falls back to IP when there is no Authorization header', () => {
    const req = makeRequest({ ip: '203.0.113.5' });
    expect(getRateLimitIdentifier(req)).toBe('ip:203.0.113.5');
  });

  it('falls back to IP when the Bearer token is malformed', () => {
    const req = makeRequest({ ip: '203.0.113.5', headers: { authorization: 'Bearer not-a-jwt' } });
    expect(getRateLimitIdentifier(req)).toBe('ip:203.0.113.5');
  });

  it('falls back to IP when the token payload has no sub claim', () => {
    const req = makeRequest({ ip: '203.0.113.5', headers: { authorization: bearerFor({ role: 'USER' }) } });
    expect(getRateLimitIdentifier(req)).toBe('ip:203.0.113.5');
  });

  it('two different users behind the same IP get independent identifiers', () => {
    const reqA = makeRequest({ ip: '203.0.113.5', headers: { authorization: bearerFor({ sub: 'user-a' }) } });
    const reqB = makeRequest({ ip: '203.0.113.5', headers: { authorization: bearerFor({ sub: 'user-b' }) } });
    expect(getRateLimitIdentifier(reqA)).not.toBe(getRateLimitIdentifier(reqB));
  });
});
