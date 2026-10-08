import '../setup/saavnMock';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { getCsrfToken } from '../helpers/csrf';
import { prismaMock } from '../setup/prismaMock';
import { saavnMock } from '../setup/saavnMock';
import { env } from '@config/env';

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
  it('delegates to RecommendationService\'s real scoring engine (not a mock) and shapes {trackId, score, reason}', async () => {
    mockCleanRecommendationBaseline();
    saavnMock.getTrendingTracks.mockResolvedValue([{ id: 'track-real-1', genre: 'pop', title: 'Real Song' }]);
    const { agent } = await authedAgent();

    const res = await agent.get('/api/ai/recommendations').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        trackId: 'track-real-1',
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

  it('with Gemini set up: asks again until exactly 30 are found, in order, with its title, skipping the keyword search', async () => {
    const round1 = Array.from({ length: 30 }, (_, i) => ({ title: `Song ${i}`, artist: 'Artist' }));
    const more = Array.from({ length: 20 }, (_, i) => ({ title: `More ${i}`, artist: 'Artist' }));
    // Round 2 only repeats round 1; round 3 repeats "Song 0" under another artist, then has new songs.
    const rounds = [round1, round1, [{ title: 'Song 0', artist: 'Other Artist' }, ...more]];
    const prompts: string[] = [];
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init: any) => {
      prompts.push(JSON.parse(init.body).contents[0].parts[0].text);
      const songs = rounds[prompts.length - 1];
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'Gym Fuel', songs }) }] } }] }));
    });
    // Only the even-numbered first-round picks are on JioSaavn: 15 of 30. "Other Artist" finds
    // the same recording on another album, under another id.
    saavnMock.findSongByDuration.mockImplementation((_q: string, _d: number, artist: string, title: string) =>
      Promise.resolve(
        /^Song \d*[13579]$/.test(title) ? null : { id: `${artist === 'Other Artist' ? 'alt' : 'id'}-${title}`, title, duration: 200 }
      )
    );
    prismaMock.playlist.create.mockResolvedValue({ id: 'playlist-3', title: 'Gym Fuel', tracks: [] } as any);
    const { agent, csrfToken } = await authedAgent();

    env.GEMINI_API_KEY = 'test-key';
    let res;
    try {
      res = await agent
        .post('/api/ai/playlist/generate')
        .set('x-csrf-token', csrfToken)
        .set('Authorization', authHeader())
        .send({ prompt: 'workout songs' });
    } finally {
      env.GEMINI_API_KEY = ''; // or later tests would call the real Gemini
    }

    expect(res.status).toBe(201);
    const { data } = prismaMock.playlist.create.mock.calls[0][0] as any;
    expect(data.title).toBe('Gym Fuel');
    expect(data.tracks.create.map((t: any) => t.trackId)).toEqual(
      [...round1.filter((_, i) => i % 2 === 0), ...more.slice(0, 15)].map((s) => `id-${s.title}`)
    );
    // Later rounds ask for 3x the 15 missing and leave out everything tried, found or not.
    expect(prompts).toHaveLength(3);
    expect(prompts[1]).toContain('Pick 45 ');
    expect(prompts[1]).toContain('Song 1 by Artist; Song 2 by Artist');
    expect(saavnMock.getRecommendationsByGenres).not.toHaveBeenCalled();
  });

  it("with Gemini out of time short of 30: fills up from JioSaavn's suggestions in the playlist's language", async () => {
    const songs = Array.from({ length: 12 }, (_, i) => ({ title: `Song ${i}`, artist: 'Artist' }));
    const realNow = Date.now;
    let skew = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + skew);
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      skew = 60_000; // the first round uses up the whole time budget
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'Ghats', songs }) }] } }] }));
    });
    saavnMock.findSongByDuration.mockImplementation((_q: string, _d: number, _a: string, title: string) =>
      Promise.resolve({ id: `id-${title}`, title, duration: 200, genre: 'tamil' })
    );
    // Each seed's first suggestion is Hindi (skipped); the second repeats "Song 0" on another album (skipped).
    saavnMock.getSongSuggestions.mockImplementation((id: string) =>
      Promise.resolve([
        { id: `${id}-hindi`, title: `${id} hindi`, duration: 200, genre: 'hindi' },
        { id: `${id}-dup`, title: 'Song 0', duration: 200, genre: 'tamil' },
        ...Array.from({ length: 8 }, (_, i) => ({ id: `${id}-s${i}`, title: `${id} s${i}`, duration: 200, genre: 'tamil' })),
      ])
    );
    prismaMock.playlist.create.mockResolvedValue({ id: 'playlist-4', title: 'Ghats', tracks: [] } as any);
    const { agent, csrfToken } = await authedAgent();

    env.GEMINI_API_KEY = 'test-key';
    let res;
    try {
      res = await agent
        .post('/api/ai/playlist/generate')
        .set('x-csrf-token', csrfToken)
        .set('Authorization', authHeader())
        .send({ prompt: 'music for a train journey' });
    } finally {
      env.GEMINI_API_KEY = '';
    }

    expect(res.status).toBe(201);
    const { data } = prismaMock.playlist.create.mock.calls[0][0] as any;
    const fill = (seed: string, n: number) => Array.from({ length: n }, (_, i) => `id-${seed}-s${i}`);
    expect(data.tracks.create.map((t: any) => t.trackId)).toEqual([
      ...songs.map((s) => `id-${s.title}`),
      ...fill('Song 0', 8),
      ...fill('Song 1', 8),
      ...fill('Song 2', 2),
    ]);
    expect(saavnMock.getSongSuggestions).toHaveBeenCalledTimes(3);
  });

  it('with Gemini out of quota after the first round: stops asking and fills up from JioSaavn', async () => {
    const songs = Array.from({ length: 12 }, (_, i) => ({ title: `Song ${i}`, artist: 'Artist' }));
    let calls = 0;
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      // The quota (shared by every user) runs out right after the first answer.
      if (calls++ > 0) return new Response('{"error":{"code":429}}', { status: 429 });
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'Ghats', songs }) }] } }] }));
    });
    saavnMock.findSongByDuration.mockImplementation((_q: string, _d: number, _a: string, title: string) =>
      Promise.resolve({ id: `id-${title}`, title, duration: 200, genre: 'tamil' })
    );
    saavnMock.getSongSuggestions.mockImplementation((id: string) =>
      Promise.resolve(Array.from({ length: 10 }, (_, i) => ({ id: `${id}-s${i}`, title: `${id} s${i}`, duration: 200, genre: 'tamil' })))
    );
    prismaMock.playlist.create.mockResolvedValue({ id: 'playlist-5', title: 'Ghats', tracks: [] } as any);
    const { agent, csrfToken } = await authedAgent();

    env.GEMINI_API_KEY = 'test-key';
    let res;
    try {
      res = await agent
        .post('/api/ai/playlist/generate')
        .set('x-csrf-token', csrfToken)
        .set('Authorization', authHeader())
        .send({ prompt: 'music for a train journey' });
    } finally {
      env.GEMINI_API_KEY = '';
    }

    expect(res.status).toBe(201);
    expect((prismaMock.playlist.create.mock.calls[0][0] as any).data.tracks.create).toHaveLength(30);
    // The first answer, then one round that failed (each model twice), not round after round until the time budget ends.
    expect(calls).toBe(1 + 4);
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
