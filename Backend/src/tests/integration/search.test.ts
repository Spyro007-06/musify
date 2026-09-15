import '../setup/saavnMock';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
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

const emptySearchResult = { tracks: [], albums: [], artists: [], playlists: [] };

describe('GET /api/search — empty/garbage input', () => {
  it('an empty query returns an empty, correctly-shaped result without crashing', async () => {
    const res = await request(app).get('/api/search').query({ q: '' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(emptySearchResult);
  });

  it('a missing q param behaves the same as empty', async () => {
    const res = await request(app).get('/api/search');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(emptySearchResult);
  });

  it('does not log SearchHistory for an empty query', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    await request(app).get('/api/search').query({ q: '   ' }).set('Authorization', authHeader());
    expect(prismaMock.searchHistory.create).not.toHaveBeenCalled();
  });

  it('a nonsense/garbage query does not crash — falls through to keyword search', async () => {
    saavnMock.search.mockResolvedValue(emptySearchResult);
    const res = await request(app).get('/api/search').query({ q: '!@#$%^&&&***asdkfjhaslkdfj' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(emptySearchResult);
  });
});

describe('GET /api/search — result shape and SearchHistory logging (feeds the recommendation candidate pool)', () => {
  it('returns tracks/albums/artists/playlists in the documented shape for a plain keyword query', async () => {
    saavnMock.search.mockResolvedValue({
      tracks: [{ id: 't1', title: 'Song', artists: [{ id: 'a1', name: 'Artist' }] }],
      albums: [{ id: 'al1', title: 'Album' }],
      artists: [{ id: 'a1', name: 'Artist' }],
      playlists: [{ id: 'p1', title: 'Playlist' }],
    });
    prismaMock.likedTrack.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/search').query({ q: 'love' });

    expect(res.status).toBe(200);
    expect(res.body.data.tracks[0]).toEqual(expect.objectContaining({ id: 't1' }));
    expect(res.body.data.albums[0]).toEqual(expect.objectContaining({ id: 'al1' }));
    expect(res.body.data.artists[0]).toEqual(expect.objectContaining({ id: 'a1' }));
    expect(res.body.data.playlists[0]).toEqual(expect.objectContaining({ id: 'p1' }));
  });

  it('logs the query to SearchHistory for an authenticated user (this feeds recommendation candidate generation)', async () => {
    saavnMock.search.mockResolvedValue(emptySearchResult);
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.searchHistory.create.mockResolvedValue({} as any);

    await request(app).get('/api/search').query({ q: 'love' }).set('Authorization', authHeader());

    expect(prismaMock.searchHistory.create).toHaveBeenCalledWith({ data: { userId: user.id, query: 'love' } });
  });

  it('does not log SearchHistory for an unauthenticated search', async () => {
    saavnMock.search.mockResolvedValue(emptySearchResult);
    await request(app).get('/api/search').query({ q: 'love' });
    expect(prismaMock.searchHistory.create).not.toHaveBeenCalled();
  });

  it('a failure logging SearchHistory does not fail the search response itself', async () => {
    saavnMock.search.mockResolvedValue(emptySearchResult);
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.searchHistory.create.mockRejectedValue(new Error('db hiccup'));

    const res = await request(app).get('/api/search').query({ q: 'love' }).set('Authorization', authHeader());

    expect(res.status).toBe(200);
  });
});

describe('GET /api/search — intent parsing', () => {
  it('"X songs" routes to genre/vibe search', async () => {
    saavnMock.getRecommendationsByGenres.mockResolvedValue([{ id: 't1', title: 'Sad Song', artists: [] }]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/search').query({ q: 'sad songs' });

    expect(res.status).toBe(200);
    expect(saavnMock.getRecommendationsByGenres).toHaveBeenCalledWith(['sad'], 20);
    expect(res.body.data.tracks[0].id).toBe('t1');
  });

  it('"songs similar to X" routes to the similarity path', async () => {
    saavnMock.search.mockResolvedValue({
      tracks: [{ id: 'seed', title: 'Seed', artists: [{ id: 'artist-x', name: 'X' }] }],
      albums: [],
      artists: [],
      playlists: [],
    });
    saavnMock.getArtistTopTracks.mockResolvedValue([{ id: 'similar-1', title: 'Similar', artists: [] }]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/search').query({ q: 'songs similar to Believer' });

    expect(res.status).toBe(200);
    expect(saavnMock.search).toHaveBeenCalledWith('believer'); // intent parsing operates on the lowercased query
    expect(saavnMock.getArtistTopTracks).toHaveBeenCalledWith('artist-x');
    expect(res.body.data.tracks[0].id).toBe('similar-1');
  });

  it('"my liked songs" (authenticated) returns the user\'s own LikedTrack rows, hydrated', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user as any);
    prismaMock.searchHistory.create.mockResolvedValue({} as any);
    prismaMock.likedTrack.findMany.mockResolvedValue([{ spotifyTrackId: 't1' } as any]);
    saavnMock.getTracks.mockResolvedValue([{ id: 't1', title: 'My Song', artists: [] }]);

    const res = await request(app).get('/api/search').query({ q: 'my liked songs' }).set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(saavnMock.getTracks).toHaveBeenCalledWith(['t1']);
    expect(res.body.data.tracks[0].id).toBe('t1');
  });

  it('"my liked songs" for an unauthenticated user falls through to keyword search instead of crashing', async () => {
    saavnMock.search.mockResolvedValue(emptySearchResult);
    const res = await request(app).get('/api/search').query({ q: 'my liked songs' });
    expect(res.status).toBe(200);
    expect(prismaMock.likedTrack.findMany).not.toHaveBeenCalled();
  });
});

describe('external Saavn failure on search degrades cleanly', () => {
  it('an unexpected rejection becomes a normal 500, not a crash', async () => {
    saavnMock.search.mockRejectedValue(new Error('upstream exploded'));
    const res = await request(app).get('/api/search').query({ q: 'love' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/search/suggestions — short/empty input', () => {
  it('an empty query returns an empty array', async () => {
    saavnMock.getSuggestions.mockResolvedValue([]);
    const res = await request(app).get('/api/search/suggestions').query({ q: '' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('a short query is passed straight through to the catalog source', async () => {
    saavnMock.getSuggestions.mockResolvedValue(['love story', 'love yourself']);
    const res = await request(app).get('/api/search/suggestions').query({ q: 'lo' });
    expect(res.status).toBe(200);
    expect(saavnMock.getSuggestions).toHaveBeenCalledWith('lo');
    expect(res.body.data).toEqual(['love story', 'love yourself']);
  });

  it('does not require authentication', async () => {
    saavnMock.getSuggestions.mockResolvedValue([]);
    const res = await request(app).get('/api/search/suggestions').query({ q: 'x' });
    expect(res.status).toBe(200);
  });
});
