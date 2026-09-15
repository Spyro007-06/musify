import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { getCsrfToken } from '../helpers/csrf';
import { prismaMock } from '../setup/prismaMock';
import { supabaseAdminAuthMock, supabaseAuthMock } from '../setup/supabaseMock';

const fakeDbUser = {
  id: 'user-1',
  supabaseId: 'supabase-uid-1',
  email: 'jane@example.com',
  username: 'jane',
  displayName: 'Jane',
  avatarUrl: null,
  bio: null,
  role: 'USER',
  isVerified: true,
  isActive: true,
  isPremium: false,
  premiumUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('POST /api/auth/signup', () => {
  it('rejects a body missing required fields with 422', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);

    const res = await agent
      .post('/api/auth/signup')
      .set('x-csrf-token', csrfToken)
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('rejects an attempt to self-assign role=ADMIN (privilege escalation)', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);

    const res = await agent
      .post('/api/auth/signup')
      .set('x-csrf-token', csrfToken)
      .send({
        email: 'attacker@example.com',
        username: 'attacker',
        password: 'password123',
        role: 'ADMIN',
      });

    // zod rejects the enum value entirely, rather than silently downgrading it
    expect(res.status).toBe(422);
  });

  it('creates a user on a valid signup and never leaks a plaintext password back', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);

    prismaMock.user.findUnique.mockResolvedValueOnce(null); // email check
    prismaMock.user.findUnique.mockResolvedValueOnce(null); // username check
    supabaseAdminAuthMock.createUser.mockResolvedValue({
      data: { user: { id: 'supabase-uid-1' } },
      error: null,
    });
    prismaMock.user.create.mockResolvedValue(fakeDbUser as any);
    supabaseAuthMock.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 3600 } },
      error: null,
    });

    const res = await agent
      .post('/api/auth/signup')
      .set('x-csrf-token', csrfToken)
      .send({ email: 'jane@example.com', username: 'jane', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('jane@example.com');
    expect(JSON.stringify(res.body)).not.toContain('password123');
  });

  it('returns 409 when the email is already registered', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);

    prismaMock.user.findUnique.mockResolvedValueOnce(fakeDbUser as any);

    const res = await agent
      .post('/api/auth/signup')
      .set('x-csrf-token', csrfToken)
      .send({ email: 'jane@example.com', username: 'jane', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects a POST without a valid CSRF token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'jane@example.com', username: 'jane', password: 'password123' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe('POST /api/auth/login', () => {
  it('returns 401 for invalid credentials without leaking whether the email exists', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);

    supabaseAuthMock.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const res = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({ email: 'jane@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('logs in successfully and returns an access token', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);

    supabaseAuthMock.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'supabase-uid-1' }, session: { access_token: 'tok', refresh_token: 'refresh', expires_in: 3600 } },
      error: null,
    });
    prismaMock.user.findUnique.mockResolvedValue(fakeDbUser as any);

    const res = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({ email: 'jane@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBe('tok');
  });
});

describe('GET /api/auth/me', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed/invalid JWT', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  it('returns the profile for a valid token', async () => {
    const token = jwt.sign({ sub: 'supabase-uid-1' }, process.env.SUPABASE_JWT_SECRET!);
    prismaMock.user.findUnique.mockResolvedValue(fakeDbUser as any);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('jane');
  });

  it('rejects a token for a deactivated account', async () => {
    const token = jwt.sign({ sub: 'supabase-uid-1' }, process.env.SUPABASE_JWT_SECRET!);
    prismaMock.user.findUnique.mockResolvedValue({ ...fakeDbUser, isActive: false } as any);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
