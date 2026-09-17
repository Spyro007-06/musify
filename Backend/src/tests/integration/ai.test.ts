import '../setup/saavnMock';
import '../setup/anthropicMock';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { getCsrfToken } from '../helpers/csrf';
import { prismaMock } from '../setup/prismaMock';
import { saavnMock } from '../setup/saavnMock';
import { anthropicMock } from '../setup/anthropicMock';

function mockClaudeTextResponse(text: string) {
  anthropicMock.messagesCreate.mockResolvedValue({
    content: [{ type: 'text', text }],
  });
}

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

describe('POST /api/ai/lyrics/analyze', () => {
  it('handles a valid request with a real (mocked) Claude call, not a hardcoded result', async () => {
    mockClaudeTextResponse(
      JSON.stringify({
        mood: 'Reflective / Nostalgic',
        meaning: 'A real interpretation derived from the actual lyrics text passed in.',
        trivia: 'A real observation about lyrical structure.',
      })
    );
    const { agent, csrfToken } = await authedAgent();
    const res = await agent
      .post('/api/ai/lyrics/analyze')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ trackId: 'track-1', lyrics: 'some real lyrics here' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      mood: 'Reflective / Nostalgic',
      meaning: 'A real interpretation derived from the actual lyrics text passed in.',
      trivia: 'A real observation about lyrical structure.',
    });
    // Confirms the actual lyrics text was sent to Claude, not ignored.
    const callArgs = anthropicMock.messagesCreate.mock.calls[0][0];
    expect(callArgs.model).toBe('claude-haiku-4-5-20251001');
    expect(callArgs.messages[0].content).toContain('some real lyrics here');
  });

  it('strips a markdown code fence if Claude wraps its JSON response in one', async () => {
    mockClaudeTextResponse('```json\n' + JSON.stringify({ mood: 'Calm', meaning: 'A calm song.', trivia: 'Simple structure.' }) + '\n```');
    const { agent, csrfToken } = await authedAgent();
    const res = await agent
      .post('/api/ai/lyrics/analyze')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ trackId: 'track-1', lyrics: 'la la la' });

    expect(res.status).toBe(200);
    expect(res.body.data.mood).toBe('Calm');
  });

  it('a malformed (non-JSON) Claude response fails cleanly with 503, not a crash or a fake success', async () => {
    mockClaudeTextResponse('Sure! This song is about love and loss.');
    const { agent, csrfToken } = await authedAgent();
    const res = await agent
      .post('/api/ai/lyrics/analyze')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ trackId: 'track-1', lyrics: 'some lyrics' });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });

  it('a Claude response missing an expected field (mood/meaning/trivia) fails cleanly with 503', async () => {
    mockClaudeTextResponse(JSON.stringify({ mood: 'Happy', meaning: 'A happy song.' })); // no trivia
    const { agent, csrfToken } = await authedAgent();
    const res = await agent
      .post('/api/ai/lyrics/analyze')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ trackId: 'track-1', lyrics: 'some lyrics' });

    expect(res.status).toBe(503);
  });

  it('a Claude API failure (network/upstream error) fails cleanly with 503, not a crash', async () => {
    anthropicMock.messagesCreate.mockRejectedValue(new Error('ECONNRESET'));
    const { agent, csrfToken } = await authedAgent();
    const res = await agent
      .post('/api/ai/lyrics/analyze')
      .set('x-csrf-token', csrfToken)
      .set('Authorization', authHeader())
      .send({ trackId: 'track-1', lyrics: 'some lyrics' });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });

  it('the Claude breaker opening after repeated failures does not affect unrelated AI functionality (breaker isolation)', async () => {
    anthropicMock.messagesCreate.mockRejectedValue(new Error('downstream is down'));
    const { agent, csrfToken } = await authedAgent();

    // Trip the claude-lyrics-analysis breaker (same volume this project's
    // own resilience.test.ts uses to reliably open a breaker).
    for (let i = 0; i < 10; i++) {
      await agent
        .post('/api/ai/lyrics/analyze')
        .set('x-csrf-token', csrfToken)
        .set('Authorization', authHeader())
        .send({ trackId: 'track-1', lyrics: 'some lyrics' });
    }

    // A completely different AIService method, on a different named
    // breaker (or no breaker at all), must still work normally — an open
    // Claude breaker must not be global failure state.
    mockCleanRecommendationBaseline();
    const recRes = await agent.get('/api/ai/recommendations').set('Authorization', authHeader());
    expect(recRes.status).toBe(200);
    expect(recRes.body.success).toBe(true);
  }, 15000);

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
    // "workout" maps to the energetic mood bucket, not a raw-prompt search.
    expect(saavnMock.getRecommendationsByGenres).toHaveBeenCalledWith(['energetic'], 30);
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
