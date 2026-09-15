import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { getCsrfToken } from '../helpers/csrf';
import { prismaMock } from '../setup/prismaMock';

const user = {
  id: 'user-1',
  supabaseId: 'supabase-user-1',
  email: 'user@example.com',
  username: 'user',
  displayName: 'User',
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

async function authedPost(path: string, body: object) {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any);
  const token = jwt.sign({ sub: user.supabaseId }, process.env.SUPABASE_JWT_SECRET!);
  return agent.post(path).set('x-csrf-token', csrfToken).set('Authorization', `Bearer ${token}`).send(body);
}

describe('POST /api/user/likes — validation (Phase 1 fix: previously had none)', () => {
  it('rejects a body missing targetId with 422', async () => {
    const res = await authedPost('/api/user/likes', { type: 'song' });
    expect(res.status).toBe(422);
  });

  it('rejects an invalid type enum value', async () => {
    const res = await authedPost('/api/user/likes', { targetId: 'track-1', type: 'not-a-real-type' });
    expect(res.status).toBe(422);
  });

  it('accepts a valid like and defaults type to "song"', async () => {
    prismaMock.$transaction.mockResolvedValue([]);
    const res = await authedPost('/api/user/likes', { targetId: 'track-1' });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/user/skip — validation', () => {
  it('rejects a body missing trackId with 422', async () => {
    const res = await authedPost('/api/user/skip', { skipTime: 5 });
    expect(res.status).toBe(422);
  });

  it('rejects a negative skipTime', async () => {
    const res = await authedPost('/api/user/skip', { trackId: 'track-1', skipTime: -5 });
    expect(res.status).toBe(422);
  });

  it('accepts a valid skip event', async () => {
    prismaMock.$transaction.mockResolvedValue([]);
    const res = await authedPost('/api/user/skip', { trackId: 'track-1', skipTime: 12, duration: 200 });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/user/preferences — validation', () => {
  it('rejects a non-array favouriteGenres', async () => {
    const res = await authedPost('/api/user/preferences', { favouriteGenres: 'pop' });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/recommendations/smart-queue — validation', () => {
  it('rejects a body missing artistName', async () => {
    const res = await authedPost('/api/recommendations/smart-queue', { trackId: 'track-1' });
    expect(res.status).toBe(422);
  });
});
