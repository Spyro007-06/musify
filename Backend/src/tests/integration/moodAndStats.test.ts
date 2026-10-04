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
  it('summarizes a month: minutes from plays + skips, top tracks/artists/languages by completed plays', async () => {
    prismaMock.listeningHistory.findMany.mockResolvedValue([
      { trackId: 'a', artistId: 'x', genre: 'Hindi', sessionDuration: 200 },
      { trackId: 'b', artistId: 'y', genre: 'English', sessionDuration: 100 },
      { trackId: 'a', artistId: 'x', genre: 'hindi', sessionDuration: 200 },
    ] as any);
    prismaMock.skippedSongs.findMany.mockResolvedValue([{ skipTime: 40 }, { skipTime: 20 }] as any);
    saavnMock.getTracks.mockResolvedValue([{ id: 'b', title: 'B' }, { id: 'a', title: 'A' }]);
    saavnMock.getArtist.mockImplementation(async (id: string) => ({ id, name: `Artist ${id}`, image: null }));
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

  it.each(['2026-13', 'Sept', '2999-01'])('rejects month=%s with 422', async (month) => {
    const res = await authed('get', `/api/user/stats?month=${month}`);
    expect(res.status).toBe(422);
  });
});
