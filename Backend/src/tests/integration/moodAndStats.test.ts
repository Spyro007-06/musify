import '../setup/saavnMock';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { getCsrfToken } from '../helpers/csrf';
import { prismaMock } from '../setup/prismaMock';
import { saavnMock } from '../setup/saavnMock';

const user = { id: 'user-1', supabaseId: 'supabase-user-1', isActive: true, deletedAt: null, role: 'USER' };
const bearer = () => `Bearer ${jwt.sign({ sub: user.supabaseId }, process.env.SUPABASE_JWT_SECRET!)}`;

async function authed(method: 'get' | 'post' | 'delete', path: string, body?: object) {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any);
  return agent[method](path).set('x-csrf-token', csrfToken).set('Authorization', bearer()).send(body);
}

describe('mood check-in', () => {
  it('records a known mood as an explicit check-in', async () => {
    prismaMock.moodHistory.create.mockResolvedValue({} as any);
    const res = await authed('post', '/api/user/mood', { mood: 'workout' });
    expect(res.status).toBe(200);
    expect(prismaMock.moodHistory.create).toHaveBeenCalledWith({ data: { userId: 'user-1', mood: 'workout', isImplicit: false } });
  });

  it('rejects an unknown mood with 422', async () => {
    const res = await authed('post', '/api/user/mood', { mood: 'grumpy' });
    expect(res.status).toBe(422);
  });

  it('reports only a recent check-in as active', async () => {
    prismaMock.moodHistory.findFirst.mockResolvedValue({ mood: 'chill' } as any);
    const res = await authed('get', '/api/user/mood');
    expect(res.body.data).toEqual({ mood: 'chill' });
    const where = (prismaMock.moodHistory.findFirst.mock.calls[0][0] as any).where;
    expect(Date.now() - where.timestamp.gte.getTime()).toBeCloseTo(3 * 3600 * 1000, -4);
  });

  it('clears the active mood', async () => {
    prismaMock.moodHistory.deleteMany.mockResolvedValue({ count: 1 });
    const res = await authed('delete', '/api/user/mood');
    expect(res.status).toBe(200);
    expect(prismaMock.moodHistory.deleteMany).toHaveBeenCalled();
  });
});

describe('GET /api/user/stats', () => {
  const at = (iso: string) => new Date(iso);
  const song = (id: string, performers: string[]) => ({ id, title: id.toUpperCase(), performers: performers.map((p) => ({ id: p, name: p })) });

  beforeEach(() => {
    saavnMock.getArtist.mockImplementation(async (id: string) => ({ id, name: 'Artist ' + id, image: null }));
    prismaMock.likedTrack.findMany.mockResolvedValue([] as any);
  });

  it('summarizes a month: minutes from plays + skips, top tracks/artists/languages by completed plays', async () => {
    prismaMock.listeningHistory.findMany.mockResolvedValue([
      { trackId: 'a', artistId: 'x', genre: 'Hindi', sessionDuration: 200, timestamp: at('2026-09-02T10:00:00Z') },
      { trackId: 'b', artistId: 'y', genre: 'English', sessionDuration: 100, timestamp: at('2026-09-02T10:04:00Z') },
      { trackId: 'a', artistId: 'x', genre: 'hindi', sessionDuration: 200, timestamp: at('2026-09-02T10:06:00Z') },
    ] as any);
    prismaMock.skippedSongs.findMany.mockResolvedValue([
      { trackId: 'c', skipTime: 40, timestamp: at('2026-09-03T10:00:00Z') },
      { trackId: 'd', skipTime: 20, timestamp: at('2026-09-03T10:01:00Z') },
    ] as any);
    saavnMock.getTracksCached.mockResolvedValue([song('b', ['y']), song('a', ['x'])]);
    prismaMock.likedTrack.findMany.mockResolvedValue([{ trackId: 'a' }] as any);

    const res = await authed('get', '/api/user/stats?month=2026-09');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      month: '2026-09',
      minutesListened: 9, // (200 + 100 + 200 + 40 + 20) / 60
      plays: 3,
      skips: 2,
      uniqueTracks: 2,
      uniqueArtists: 2,
      topTracks: [
        { track: { id: 'a', isLiked: true }, plays: 2 },
        { track: { id: 'b', isLiked: false }, plays: 1 },
      ],
      topArtists: [
        { id: 'x', name: 'Artist x', plays: 2 },
        { id: 'y', name: 'Artist y', plays: 1 },
      ],
      topLanguages: [
        { name: 'hindi', plays: 2 },
        { name: 'english', plays: 1 },
      ],
    });
    const where = (prismaMock.listeningHistory.findMany.mock.calls[0][0] as any).where;
    expect(where).toEqual({ userId: 'user-1', completedSong: true, timestamp: { gte: new Date('2026-09-01T00:00:00Z'), lt: new Date('2026-10-01T00:00:00Z') } });
  });

  it('counts a play reported twice (same song, same time listened, seconds apart) once', async () => {
    prismaMock.listeningHistory.findMany.mockResolvedValue([
      { trackId: 'a', artistId: 'x', genre: 'hindi', sessionDuration: 274, timestamp: at('2026-09-20T10:00:00Z') },
      { trackId: 'a', artistId: 'x', genre: 'hindi', sessionDuration: 274, timestamp: at('2026-09-20T10:00:04Z') }, // the duplicate
      { trackId: 'a', artistId: 'x', genre: 'hindi', sessionDuration: 274, timestamp: at('2026-09-20T10:04:40Z') }, // a real replay
    ] as any);
    prismaMock.skippedSongs.findMany.mockResolvedValue([
      { trackId: 'b', skipTime: 30, timestamp: at('2026-09-20T11:00:00Z') },
      { trackId: 'b', skipTime: 30, timestamp: at('2026-09-20T11:00:05Z') }, // the duplicate
    ] as any);
    saavnMock.getTracksCached.mockResolvedValue([song('a', ['x'])]);

    const res = await authed('get', '/api/user/stats?month=2026-09');

    expect(res.body.data).toMatchObject({ plays: 2, skips: 1, minutesListened: 10 }); // (274 * 2 + 30) / 60 = 9.6
  });

  it("credits a song's singers, not the composer or lyricist listed first in history", async () => {
    prismaMock.listeningHistory.findMany.mockResolvedValue([
      { trackId: 'tumhiho', artistId: 'mithoon', genre: 'hindi', sessionDuration: 262, timestamp: at('2026-09-05T10:00:00Z') },
      { trackId: 'duet', artistId: 'pritam', genre: 'hindi', sessionDuration: 240, timestamp: at('2026-09-05T10:05:00Z') },
      { trackId: 'gone', artistId: 'z', genre: 'hindi', sessionDuration: 200, timestamp: at('2026-09-05T10:10:00Z') }, // no longer in the catalog
    ] as any);
    prismaMock.skippedSongs.findMany.mockResolvedValue([] as any);
    saavnMock.getTracksCached.mockResolvedValue([song('tumhiho', ['arijit']), song('duet', ['arijit', 'shreya'])]);

    const res = await authed('get', '/api/user/stats?month=2026-09');

    expect(res.body.data.topArtists).toEqual([
      expect.objectContaining({ id: 'arijit', plays: 2 }),
      expect.objectContaining({ id: 'shreya', plays: 1 }),
      expect.objectContaining({ id: 'z', plays: 1 }), // falls back to the artist the history row kept
    ]);
    expect(res.body.data.uniqueArtists).toBe(3);
    expect(saavnMock.getArtist).not.toHaveBeenCalledWith('mithoon');
  });

  it("starts the month at the listener's midnight, not UTC's", async () => {
    prismaMock.listeningHistory.findMany.mockResolvedValue([] as any);
    prismaMock.skippedSongs.findMany.mockResolvedValue([] as any);

    await authed('get', '/api/user/stats?month=2026-09&tzOffset=330');

    const where = (prismaMock.listeningHistory.findMany.mock.calls[0][0] as any).where;
    expect(where.timestamp).toEqual({ gte: new Date('2026-08-31T18:30:00Z'), lt: new Date('2026-09-30T18:30:00Z') });
  });

  it('rejects an impossible time zone offset with 422', async () => {
    const res = await authed('get', '/api/user/stats?month=2026-09&tzOffset=5000');
    expect(res.status).toBe(422);
  });

  it.each(['2026-13', 'Sept', '2999-01'])('rejects month=%s with 422', async (month) => {
    const res = await authed('get', `/api/user/stats?month=${month}`);
    expect(res.status).toBe(422);
  });
});
