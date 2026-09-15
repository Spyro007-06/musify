import '../setup/saavnMock';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { getCsrfToken } from '../helpers/csrf';
import { prismaMock } from '../setup/prismaMock';
import { saavnMock } from '../setup/saavnMock';

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
const authHeader = () => `Bearer ${jwt.sign({ sub: user.supabaseId }, process.env.SUPABASE_JWT_SECRET!)}`;

async function authedAgent() {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any);
  return { agent, csrfToken };
}

describe('auth is actually enforced on every /api/ai/* route (not just trusted from middleware config)', () => {
  it('GET /api/ai/recommendations rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/ai/recommendations');
    expect(res.status).toBe(401);
  });

  it('POST /api/ai/lyrics/analyze rejects an unauthenticated request', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);
    const res = await agent
      .post('/api/ai/lyrics/analyze')
      .set('x-csrf-token', csrfToken)
      .send({ trackId: 't1', lyrics: 'la la la' });
    expect(res.status).toBe(401);
  });

  it('POST /api/ai/playlist/generate rejects an unauthenticated request', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);
    const res = await agent
      .post('/api/ai/playlist/generate')
      .set('x-csrf-token', csrfToken)
      .send({ prompt: 'workout songs' });
    expect(res.status).toBe(401);
  });

  it('an invalid/garbage token is also rejected, not silently treated as anonymous', async () => {
    const res = await request(app).get('/api/ai/recommendations').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/ai/recommendations', () => {
  it('returns a valid request in the standard envelope', async () => {
    const { agent } = await authedAgent();
    const res = await agent.get('/api/ai/recommendations').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('POST /api/ai/lyrics/analyze', () => {
  it('handles a valid request', async () => {
    const { agent, csrfToken } = await authedAgent();
    const res = await agent
      .post('/api/ai/lyrics/analyze')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ trackId: 'track-1', lyrics: 'some lyrics here' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({ mood: expect.any(String), meaning: expect.any(String) })
    );
  });

  it('rejects a malformed request (missing lyrics) with 400, not a crash', async () => {
    const { agent, csrfToken } = await authedAgent();
    const res = await agent
      .post('/api/ai/lyrics/analyze')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ trackId: 'track-1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a malformed request (missing trackId) with 400', async () => {
    const { agent, csrfToken } = await authedAgent();
    const res = await agent
      .post('/api/ai/lyrics/analyze')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ lyrics: 'some lyrics' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/ai/playlist/generate', () => {
  it('handles a valid request: searches the catalog, persists a Playlist, returns its shape', async () => {
    saavnMock.getRecommendationsByGenres.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    prismaMock.playlist.create.mockResolvedValue({
      id: 'playlist-1',
      title: 'AI: Workout songs',
      tracks: [{ id: 'pt1' }, { id: 'pt2' }],
    } as any);
    const { agent, csrfToken } = await authedAgent();

    const res = await agent
      .post('/api/ai/playlist/generate')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ prompt: 'workout songs' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ playlistId: 'playlist-1', title: 'AI: Workout songs', trackCount: 2 });
  });

  it('rejects a malformed request (missing prompt) with 400, not a crash', async () => {
    const { agent, csrfToken } = await authedAgent();
    const res = await agent
      .post('/api/ai/playlist/generate')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({});
    expect(res.status).toBe(400);
  });

  it('an external Saavn failure degrades to a clean error response, not a crash', async () => {
    saavnMock.getRecommendationsByGenres.mockRejectedValue(new Error('upstream timeout'));
    const { agent, csrfToken } = await authedAgent();

    const res = await agent
      .post('/api/ai/playlist/generate')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ prompt: 'workout songs' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(prismaMock.playlist.create).not.toHaveBeenCalled();
  });

  it('FINDING: a prompt that matches no tracks at all also surfaces as a generic 500, not a 404/422 — the service wraps every failure mode (including "no results", a legitimate non-server-error case) in the same generic Error before it reaches the controller', async () => {
    saavnMock.getRecommendationsByGenres.mockResolvedValue([]); // no matches for any search query
    const { agent, csrfToken } = await authedAgent();

    const res = await agent
      .post('/api/ai/playlist/generate')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ prompt: 'a prompt with no matches' });

    expect(res.status).toBe(500); // documents current behavior — arguably should be 404/422
  });
});
