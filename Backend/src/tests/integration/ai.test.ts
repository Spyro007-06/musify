import '../setup/saavnMock';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { getCsrfToken } from '../helpers/csrf';
import { prismaMock } from '../setup/prismaMock';
import { saavnMock } from '../setup/saavnMock';

/** Baseline so RecommendationService's real candidate-pool/scoring pipeline
 * (which AIService.getRecommendations now delegates to) doesn't throw on
 * unconfigured Prisma calls — same baseline recommendationService.test.ts
 * uses for a "no signal yet" user. */
function mockCleanRecommendationBaseline() {
  prismaMock.userPreferences.findUnique.mockResolvedValue(null);
  prismaMock.genreAffinity.findMany.mockResolvedValue([]);
  prismaMock.artistAffinity.findMany.mockResolvedValue([]);
  prismaMock.likedTrack.findMany.mockResolvedValue([]);
  prismaMock.searchHistory.findMany.mockResolvedValue([]);
  prismaMock.listeningHistory.findMany.mockResolvedValue([]);
  (prismaMock.listeningHistory.groupBy as unknown as jest.Mock).mockResolvedValue([]);
  prismaMock.recommendationScores.findMany.mockResolvedValue([]);
  saavnMock.getTrendingTracks.mockResolvedValue([]);
  saavnMock.getNewReleases.mockResolvedValue([]);
}

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
  it('delegates to RecommendationService\'s real scoring engine (not a mock) and shapes {spotifyTrackId, score, reason}', async () => {
    mockCleanRecommendationBaseline();
    saavnMock.getTrendingTracks.mockResolvedValue([{ id: 'track-real-1', genre: 'pop', title: 'Real Song' }]);
    const { agent } = await authedAgent();

    const res = await agent.get('/api/ai/recommendations').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        spotifyTrackId: 'track-real-1',
        score: expect.any(Number),
        reason: expect.any(String),
      })
    );
    // Score is normalized to a 0-1 fraction (the contract the old mock
    // established with 0.95/0.88), not the engine's internal 0-100 scale.
    expect(res.body.data[0].score).toBeLessThanOrEqual(1);
  });

  it('returns a real empty array (not a fake result) when the engine has nothing to recommend', async () => {
    mockCleanRecommendationBaseline();
    const { agent } = await authedAgent();

    const res = await agent.get('/api/ai/recommendations').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('POST /api/ai/playlist/generate', () => {
  it('genre/mood prompt: parses intent, fetches real catalog tracks, persists a Playlist', async () => {
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
    // "workout" maps to the energetic mood bucket, but searches using the
    // specific matched keyword ("workout") rather than the generic bucket
    // label ("energetic") — a literal "energetic" search mostly surfaces
    // unrelated tracks that just happen to have that word in the title.
    expect(saavnMock.getRecommendationsByGenres).toHaveBeenCalledWith(['workout'], 30);
  });

  it('artist-similarity prompt: resolves the named artist and routes into ArtistService top-tracks/related-artists', async () => {
    saavnMock.search.mockResolvedValue({
      artists: [{ id: 'artist-1', name: 'Test Artist', image: 'https://example.com/art.jpg' }],
      tracks: [],
      albums: [],
      playlists: [],
    });
    saavnMock.getArtistTopTracks.mockImplementation((id: string) =>
      Promise.resolve(id === 'artist-1' ? [{ id: 'seed-t1' }] : [{ id: `${id}-t1` }])
    );
    saavnMock.getRelatedArtists.mockResolvedValue([{ id: 'artist-2', name: 'Related Artist' }]);
    prismaMock.playlist.create.mockResolvedValue({
      id: 'playlist-2',
      title: 'AI: Songs like test artist',
      tracks: [{ id: 'pt1' }, { id: 'pt2' }],
    } as any);
    const { agent, csrfToken } = await authedAgent();

    const res = await agent
      .post('/api/ai/playlist/generate')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ prompt: 'songs like Test Artist' });

    expect(res.status).toBe(201);
    expect(saavnMock.search).toHaveBeenCalledWith('test artist');
    expect(saavnMock.getArtistTopTracks).toHaveBeenCalledWith('artist-1');
    expect(saavnMock.getRelatedArtists).toHaveBeenCalledWith('artist-1');
    expect(saavnMock.getArtistTopTracks).toHaveBeenCalledWith('artist-2');
    expect(saavnMock.getRecommendationsByGenres).not.toHaveBeenCalled();
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

  it('a genre/mood prompt whose catalog search comes back empty returns 200 with an empty tracks array and a message', async () => {
    saavnMock.getRecommendationsByGenres.mockResolvedValue([]);
    const { agent, csrfToken } = await authedAgent();

    const res = await agent
      .post('/api/ai/playlist/generate')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ prompt: 'some jazz please' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(
      expect.objectContaining({ playlistId: null, tracks: [], message: expect.any(String) })
    );
    expect(prismaMock.playlist.create).not.toHaveBeenCalled();
  });

  it('a gibberish prompt with no recognizable genre/mood/era/artist returns 200 without ever hitting the catalog', async () => {
    const { agent, csrfToken } = await authedAgent();

    const res = await agent
      .post('/api/ai/playlist/generate')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ prompt: 'asdkjfh qwoeiru zzzzz' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({ playlistId: null, tracks: [], message: expect.any(String) })
    );
    expect(saavnMock.getRecommendationsByGenres).not.toHaveBeenCalled();
    expect(saavnMock.search).not.toHaveBeenCalled();
    expect(prismaMock.playlist.create).not.toHaveBeenCalled();
  });
});
