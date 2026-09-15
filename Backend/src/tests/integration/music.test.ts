import '../setup/saavnMock';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { prismaMock } from '../setup/prismaMock';
import { saavnMock } from '../setup/saavnMock';
import { getCsrfToken } from '../helpers/csrf';

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

const track = (overrides: Partial<any> = {}) => ({
  id: 'track-1',
  title: 'Test Song',
  duration: 180,
  artwork: 'https://example.com/art.jpg',
  audioUrl: 'https://example.com/audio.mp3',
  artists: [{ id: 'artist-1', name: 'Test Artist' }],
  genre: 'pop',
  playCount: 1000,
  ...overrides,
});

describe('GET /api/music/trending', () => {
  it('returns correctly shaped track data without requiring auth', async () => {
    saavnMock.getTrendingTracks.mockResolvedValue([track()]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/music/trending');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({ id: 'track-1', title: 'Test Song', isLiked: false }),
    ]);
  });

  it('marks a track as liked when the (optional) authenticated user has liked it', async () => {
    saavnMock.getTrendingTracks.mockResolvedValue([track()]);
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.likedTrack.findMany.mockResolvedValue([{ spotifyTrackId: 'track-1' } as any]);

    const res = await request(app).get('/api/music/trending').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data[0].isLiked).toBe(true);
  });
});

describe('GET /api/music/new-releases', () => {
  it('returns correctly shaped album data', async () => {
    saavnMock.getNewReleases.mockResolvedValue([
      { id: 'album-1', title: 'Test Album', artist: { id: 'a1', name: 'Artist' }, tracks: [] },
    ]);

    const res = await request(app).get('/api/music/new-releases');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ id: 'album-1', title: 'Test Album' })]);
  });
});

describe('GET /api/music/recommended', () => {
  it('returns correctly shaped track data for an anonymous request', async () => {
    saavnMock.getRecommendedTracks.mockResolvedValue([track()]);
    const res = await request(app).get('/api/music/recommended');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toEqual(expect.objectContaining({ id: 'track-1' }));
  });

  it('for an authenticated user, derives signals from their own history/likes/follows before recommending', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.likedTrack.findMany.mockResolvedValue([{ spotifyTrackId: 'track-1' } as any]);
    prismaMock.listeningHistory.findMany.mockResolvedValue([]);
    prismaMock.artistAffinity.findMany.mockResolvedValue([]);
    saavnMock.getTracks.mockResolvedValue([track({ genre: 'hindi' })]);
    saavnMock.getRecommendations.mockResolvedValue([track({ id: 'rec-1' })]);

    const res = await request(app).get('/api/music/recommended').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(saavnMock.getRecommendations).toHaveBeenCalledWith(['hindi'], ['Test Artist'], 20);
    expect(res.body.data[0].id).toBe('rec-1');
  });

  it('falls back to generic recommendations when signal-derivation throws, instead of erroring the request', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    // Once for the signal-derivation Promise.all (should be caught internally and fall back)...
    prismaMock.likedTrack.findMany.mockRejectedValueOnce(new Error('db hiccup'));
    // ...then populateLikes() makes its own separate likedTrack.findMany call on the fallback path.
    prismaMock.likedTrack.findMany.mockResolvedValueOnce([]);
    saavnMock.getRecommendedTracks.mockResolvedValue([track({ id: 'fallback-1' })]);

    const res = await request(app).get('/api/music/recommended').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe('fallback-1');
  });

  it('FINDING: a transient DB failure while annotating isLiked fails the whole response, even though the core recommendation data was already fetched successfully — populateLikes() has no error handling of its own', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    saavnMock.getRecommendedTracks.mockResolvedValue([track()]);
    prismaMock.likedTrack.findMany.mockRejectedValue(new Error('db hiccup')); // every call rejects, including populateLikes'

    const res = await request(app).get('/api/music/recommended').set('Authorization', authHeader());

    expect(res.status).toBe(500); // documents current behavior — arguably should degrade to isLiked:false instead
  });
});

describe('GET /api/music/tracks/:id', () => {
  it('returns 404 (not a 500) when Saavn has no such track', async () => {
    saavnMock.getTrack.mockResolvedValue(null);
    const res = await request(app).get('/api/music/tracks/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns the track when found', async () => {
    saavnMock.getTrack.mockResolvedValue(track());
    const res = await request(app).get('/api/music/tracks/track-1');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('track-1');
  });
});

describe('GET /api/music/tracks/:trackId/stream', () => {
  it('logs a play in ListeningHistory for an authenticated user and returns the stream url', async () => {
    saavnMock.getTrack.mockResolvedValue(track({ audioUrl: 'https://example.com/stream.mp3' }));
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.listeningHistory.create.mockResolvedValue({} as any);

    const res = await request(app).get('/api/music/tracks/track-1/stream').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.url).toBe('https://example.com/stream.mp3');
    expect(prismaMock.listeningHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: user.id, spotifyTrackId: 'track-1' }) })
    );
  });

  it('does not log a play for an unauthenticated request', async () => {
    saavnMock.getTrack.mockResolvedValue(track());
    const res = await request(app).get('/api/music/tracks/track-1/stream');
    expect(res.status).toBe(200);
    expect(prismaMock.listeningHistory.create).not.toHaveBeenCalled();
  });

  it('degrades to a clean 404 (not a crash) when the external source has no track', async () => {
    saavnMock.getTrack.mockResolvedValue(null);
    const res = await request(app).get('/api/music/tracks/gone/stream');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

async function authedAgent() {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any);
  return { agent, csrfToken, authHeader: authHeader() };
}

describe('POST/DELETE /api/music/tracks/:trackId/like — toggle + idempotency + auth boundary', () => {
  it('rejects like/unlike without auth', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);
    const likeRes = await agent.post('/api/music/tracks/track-1/like').set('x-csrf-token', csrfToken);
    const unlikeRes = await agent.delete('/api/music/tracks/track-1/like').set('x-csrf-token', csrfToken);
    expect(likeRes.status).toBe(401);
    expect(unlikeRes.status).toBe(401);
  });

  it('likes a track: creates a LikedTrack row', async () => {
    saavnMock.getTrack.mockResolvedValue(track());
    prismaMock.likedTrack.findUnique.mockResolvedValue(null);
    prismaMock.likedTrack.create.mockResolvedValue({} as any);
    const { agent, csrfToken, authHeader: h } = await authedAgent();

    const res = await agent.post('/api/music/tracks/track-1/like').set('x-csrf-token', csrfToken).set('Authorization', h);

    expect(res.status).toBe(200);
    expect(prismaMock.likedTrack.create).toHaveBeenCalledTimes(1);
  });

  it('liking an already-liked track is idempotent — no duplicate create, no error', async () => {
    saavnMock.getTrack.mockResolvedValue(track());
    prismaMock.likedTrack.findUnique.mockResolvedValue({ id: 'like-1' } as any); // already liked
    const { agent, csrfToken, authHeader: h } = await authedAgent();

    const res = await agent.post('/api/music/tracks/track-1/like').set('x-csrf-token', csrfToken).set('Authorization', h);

    expect(res.status).toBe(200);
    expect(prismaMock.likedTrack.create).not.toHaveBeenCalled();
  });

  it('unlikes a previously-liked track', async () => {
    prismaMock.likedTrack.findUnique.mockResolvedValue({ id: 'like-1' } as any);
    prismaMock.likedTrack.delete.mockResolvedValue({} as any);
    const { agent, csrfToken, authHeader: h } = await authedAgent();

    const res = await agent.delete('/api/music/tracks/track-1/like').set('x-csrf-token', csrfToken).set('Authorization', h);

    expect(res.status).toBe(200);
    expect(prismaMock.likedTrack.delete).toHaveBeenCalledWith({ where: { id: 'like-1' } });
  });

  it('FINDING: unliking a track that is not liked returns 404, not a silent no-op — not idempotent in the strict sense', async () => {
    prismaMock.likedTrack.findUnique.mockResolvedValue(null);
    const { agent, csrfToken, authHeader: h } = await authedAgent();

    const res = await agent.delete('/api/music/tracks/track-1/like').set('x-csrf-token', csrfToken).set('Authorization', h);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/music/liked and /api/music/recently-played — auth + ordering', () => {
  it('rejects both without auth', async () => {
    const liked = await request(app).get('/api/music/liked');
    const recent = await request(app).get('/api/music/recently-played');
    expect(liked.status).toBe(401);
    expect(recent.status).toBe(401);
  });

  it('recently-played queries ListeningHistory ordered newest-first', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.listeningHistory.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/music/recently-played').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(prismaMock.listeningHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: user.id }, orderBy: { timestamp: 'desc' } })
    );
  });
});

describe('external Saavn failures degrade to a clean error response, not a crash', () => {
  it('an unexpected rejection from the Saavn layer becomes a normal 500, not an unhandled exception', async () => {
    saavnMock.getTrack.mockRejectedValue(new Error('unexpected mapping bug'));
    const res = await request(app).get('/api/music/tracks/track-1');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('trending falls back to an empty list rather than erroring when Saavn returns nothing usable', async () => {
    saavnMock.getTrendingTracks.mockResolvedValue([]);
    const res = await request(app).get('/api/music/trending');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/music/albums/:id and /api/music/albums', () => {
  it('returns 404 for an unknown album', async () => {
    saavnMock.getAlbum.mockResolvedValue(null);
    const res = await request(app).get('/api/music/albums/unknown');
    expect(res.status).toBe(404);
  });

  it('returns a paginated albums list', async () => {
    saavnMock.getNewReleases.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
    const res = await request(app).get('/api/music/albums').query({ page: 1 });
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual(expect.objectContaining({ page: 1, total: 2 }));
  });
});

describe('GET /api/music/liked, /api/music/categories, /api/music/recommendations', () => {
  it('liked songs requires auth and returns the user\'s liked tracks', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.likedTrack.findMany.mockResolvedValue([{ spotifyTrackId: 'track-1' } as any]);
    saavnMock.getTracks.mockResolvedValue([track()]);

    const res = await request(app).get('/api/music/liked').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toEqual(expect.objectContaining({ id: 'track-1', isLiked: true }));
  });

  it('categories does not require auth', async () => {
    saavnMock.getCategories.mockResolvedValue([{ id: 'hindi', name: 'Hindi Hits' }]);
    const res = await request(app).get('/api/music/categories');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('recommendations passes language/artist filters through and respects the limit param', async () => {
    saavnMock.getRecommendations.mockResolvedValue([track()]);
    const res = await request(app).get('/api/music/recommendations').query({ languages: 'hindi', limit: '5' });
    expect(res.status).toBe(200);
    expect(saavnMock.getRecommendations).toHaveBeenCalledWith(['hindi'], [], 5);
  });
});

describe('GET /api/music/mood/:mood', () => {
  it('passes the requested mood through to the catalog source', async () => {
    saavnMock.getMoodPlaylists.mockResolvedValue([{ id: 'p1', title: 'Chill Vibes' }]);

    const res = await request(app).get('/api/music/mood/chill');

    expect(res.status).toBe(200);
    expect(saavnMock.getMoodPlaylists).toHaveBeenCalledWith('chill');
    expect(res.body.data).toEqual([expect.objectContaining({ id: 'p1' })]);
  });
});
