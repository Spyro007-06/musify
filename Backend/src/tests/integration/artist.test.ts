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

const artist = (overrides: Partial<any> = {}) => ({
  id: 'artist-1',
  name: 'Test Artist',
  image: 'https://example.com/art.jpg',
  followers: 1000,
  isVerified: true,
  genres: ['pop'],
  bio: 'A test artist',
  ...overrides,
});

async function authedMutation(method: 'post' | 'delete', path: string) {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any);
  return agent[method](path).set('x-csrf-token', csrfToken).set('Authorization', authHeader());
}

describe('GET /api/artists/:id', () => {
  it('returns 404 (not 500) for an unknown artist id', async () => {
    saavnMock.getArtist.mockResolvedValue(null);
    const res = await request(app).get('/api/artists/unknown-id');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns the artist with isFollowing=false for an anonymous request', async () => {
    saavnMock.getArtist.mockResolvedValue(artist());
    const res = await request(app).get('/api/artists/artist-1');
    expect(res.status).toBe(200);
    expect(res.body.data.isFollowing).toBe(false);
  });

  it('returns isFollowing=true only when this specific user follows this specific artist', async () => {
    saavnMock.getArtist.mockResolvedValue(artist());
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.artistAffinity.findUnique.mockResolvedValue({ isFollowed: true } as any);

    const res = await request(app).get('/api/artists/artist-1').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.isFollowing).toBe(true);
    expect(prismaMock.artistAffinity.findUnique).toHaveBeenCalledWith({
      where: { userId_spotifyArtistId: { userId: user.id, spotifyArtistId: 'artist-1' } },
    });
  });

  it('an unexpected Saavn rejection becomes a 500, not a crash', async () => {
    saavnMock.getArtist.mockRejectedValue(new Error('upstream exploded'));
    const res = await request(app).get('/api/artists/artist-1');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/artists/:id/top-tracks, /albums, /related', () => {
  it('top-tracks: an unknown artist returns an empty list, not an error', async () => {
    saavnMock.getArtistTopTracks.mockResolvedValue([]);
    const res = await request(app).get('/api/artists/unknown/top-tracks');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('top-tracks: marks isLiked correctly per-track for the authenticated user', async () => {
    saavnMock.getArtistTopTracks.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.likedTrack.findMany.mockResolvedValue([{ spotifyTrackId: 't1' } as any]);

    const res = await request(app).get('/api/artists/artist-1/top-tracks').set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({ id: 't1', isLiked: true }),
      expect.objectContaining({ id: 't2', isLiked: false }),
    ]);
  });

  it('albums: returns whatever the catalog source has, empty for an unknown id', async () => {
    saavnMock.getArtistAlbums.mockResolvedValue([]);
    const res = await request(app).get('/api/artists/unknown/albums');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('related: returns whatever the catalog source has, empty for an unknown id', async () => {
    saavnMock.getRelatedArtists.mockResolvedValue([]);
    const res = await request(app).get('/api/artists/unknown/related');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('POST/DELETE /api/artists/:id/follow — toggle + auth boundary', () => {
  it('rejects follow/unfollow without auth', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);
    const followRes = await agent.post('/api/artists/artist-1/follow').set('x-csrf-token', csrfToken);
    const unfollowRes = await agent.delete('/api/artists/artist-1/follow').set('x-csrf-token', csrfToken);
    expect(followRes.status).toBe(401);
    expect(unfollowRes.status).toBe(401);
  });

  it('follows an unknown artist -> 404, does not write ArtistAffinity', async () => {
    saavnMock.getArtist.mockResolvedValue(null);
    const res = await authedMutation('post', '/api/artists/unknown/follow');
    expect(res.status).toBe(404);
    expect(prismaMock.artistAffinity.upsert).not.toHaveBeenCalled();
  });

  it('follows a real artist: upserts ArtistAffinity with isFollowed=true, scoped to this user', async () => {
    saavnMock.getArtist.mockResolvedValue(artist());
    prismaMock.artistAffinity.findUnique.mockResolvedValue(null);
    prismaMock.artistAffinity.upsert.mockResolvedValue({} as any);

    const res = await authedMutation('post', '/api/artists/artist-1/follow');

    expect(res.status).toBe(200);
    expect(prismaMock.artistAffinity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_spotifyArtistId: { userId: user.id, spotifyArtistId: 'artist-1' } },
        update: { isFollowed: true },
      })
    );
  });

  it('following an already-followed artist is idempotent — no duplicate write', async () => {
    saavnMock.getArtist.mockResolvedValue(artist());
    prismaMock.artistAffinity.findUnique.mockResolvedValue({ isFollowed: true } as any);

    const res = await authedMutation('post', '/api/artists/artist-1/follow');

    expect(res.status).toBe(200);
    expect(prismaMock.artistAffinity.upsert).not.toHaveBeenCalled();
  });

  it('unfollows a followed artist: sets isFollowed=false', async () => {
    prismaMock.artistAffinity.findUnique.mockResolvedValue({ id: 'aff-1', isFollowed: true } as any);
    prismaMock.artistAffinity.update.mockResolvedValue({} as any);

    const res = await authedMutation('delete', '/api/artists/artist-1/follow');

    expect(res.status).toBe(200);
    expect(prismaMock.artistAffinity.update).toHaveBeenCalledWith({
      where: { id: 'aff-1' },
      data: { isFollowed: false },
    });
  });

  it('unfollowing an artist you do not follow returns 404', async () => {
    prismaMock.artistAffinity.findUnique.mockResolvedValue(null);
    const res = await authedMutation('delete', '/api/artists/artist-1/follow');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/artists/recommendations', () => {
  it('does not require authentication', async () => {
    saavnMock.search.mockResolvedValue({ artists: [artist({ id: 'default-1' })], tracks: [], albums: [], playlists: [] });
    const res = await request(app).get('/api/artists/recommendations');
    expect(res.status).toBe(200);
  });

  it('falls back to default popular artists when no `artists` query param is given', async () => {
    saavnMock.search.mockResolvedValue({ artists: [artist({ id: 'default-1' })], tracks: [], albums: [], playlists: [] });
    const res = await request(app).get('/api/artists/recommendations');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('FIXED: filters the queried artist out of its own "related" results — never returns the artist you searched for', async () => {
    // Searching for "Test Artist" resolves to artist-1; the related-artists lookup for
    // artist-1 (as some real catalog APIs occasionally do) includes artist-1 itself.
    saavnMock.search.mockResolvedValue({ artists: [artist({ id: 'artist-1' })], tracks: [], albums: [], playlists: [] });
    saavnMock.getRelatedArtists.mockResolvedValue([artist({ id: 'artist-1' }), artist({ id: 'artist-2', name: 'Other' })]);

    const res = await request(app).get('/api/artists/recommendations').query({ artists: 'Test Artist' });

    expect(res.status).toBe(200);
    // Same fix as RecommendationService.getRecommendedArtists: exclude the
    // seed artist's own id from the related-artists output.
    const ids = res.body.data.map((a: any) => a.id);
    expect(ids).not.toContain('artist-1');
    expect(ids).toContain('artist-2');
  });
});
