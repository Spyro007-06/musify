import request from 'supertest';

/**
 * The app protects every POST/PUT/DELETE with double-submit CSRF (see
 * app.ts). A test acting like a real client fetches a token first and
 * sends it back on the header — this exercises that middleware for real
 * instead of bypassing it. Must be called with a `request.agent(app)` so
 * the CSRF cookie set by this request is carried on subsequent ones.
 */
export async function getCsrfToken(agent: ReturnType<typeof request.agent>): Promise<string> {
  const res = await agent.get('/api/auth/csrf');
  return res.body.csrfToken;
}
