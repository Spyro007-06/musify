import '../setup/saavnMock';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { getCsrfToken } from '../helpers/csrf';
import { prismaMock } from '../setup/prismaMock';
import { saavnMock } from '../setup/saavnMock';

const owner = {
  id: 'owner-1',
  supabaseId: 'supabase-owner-1',
  email: 'owner@example.com',
  username: 'owner',
  displayName: 'Owner',
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

const intruder = { ...owner, id: 'intruder-1', supabaseId: 'supabase-intruder-1', username: 'intruder' };

function bearerFor(user: typeof owner) {
  return `Bearer ${jwt.sign({ sub: user.supabaseId }, process.env.SUPABASE_JWT_SECRET!)}`;
}

async function authedPost(path: string, user: typeof owner, body: object) {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any); // for the `authenticate` middleware lookup
  return agent.post(path).set('x-csrf-token', csrfToken).set('Authorization', bearerFor(user)).send(body);
}

async function authedDelete(path: string, user: typeof owner) {
  const agent = request.agent(app);
  const csrfToken = await getCsrfToken(agent);
  prismaMock.user.findUnique.mockResolvedValue(user as any);
  return agent.delete(path).set('x-csrf-token', csrfToken).set('Authorization', bearerFor(user));
}

describe('POST /api/playlists', () => {
  it('rejects an empty body (no title, no albumId) with 422', async () => {
    prismaMock.user.findUnique.mockResolvedValue(owner as any);
    const res = await authedPost('/api/playlists', owner, {});
    expect(res.status).toBe(422);
  });

  it('creates a playlist for the authenticated owner', async () => {
    prismaMock.playlist.create.mockResolvedValue({
      id: 'playlist-1',
      title: 'My Mix',
      description: null,
      coverUrl: null,
      isPublic: true,
      ownerId: owner.id,
    } as any);

    const res = await authedPost('/api/playlists', owner, { title: 'My Mix' });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('My Mix');
    expect(prismaMock.playlist.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ownerId: owner.id }) })
    );
  });

  it('rejects an unauthenticated request', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);
    const res = await agent.post('/api/playlists').set('x-csrf-token', csrfToken).send({ title: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/playlists/:id — ownership enforcement', () => {
  it('returns 404 when the playlist does not exist', async () => {
    prismaMock.playlist.findUnique.mockResolvedValue(null);
    const res = await authedDelete('/api/playlists/does-not-exist', owner);
    expect(res.status).toBe(404);
  });

  it("returns 403 when a non-owner tries to delete someone else's playlist", async () => {
    prismaMock.playlist.findUnique.mockResolvedValue({ id: 'playlist-1', ownerId: owner.id } as any);

    const res = await authedDelete('/api/playlists/playlist-1', intruder);

    expect(res.status).toBe(403);
    expect(prismaMock.playlist.delete).not.toHaveBeenCalled();
  });

  it('allows the owner to delete their own playlist', async () => {
    prismaMock.playlist.findUnique.mockResolvedValue({ id: 'playlist-1', ownerId: owner.id } as any);
    prismaMock.playlist.delete.mockResolvedValue({ id: 'playlist-1' } as any);

    const res = await authedDelete('/api/playlists/playlist-1', owner);

    expect(res.status).toBe(200);
    expect(prismaMock.playlist.delete).toHaveBeenCalledWith({ where: { id: 'playlist-1' } });
  });
});

describe('GET /api/playlists/:id — JioSaavn editorial playlists', () => {
  it('serves a JioSaavn playlist when the id is not one of ours', async () => {
    prismaMock.playlist.findUnique.mockResolvedValue(null);
    saavnMock.getPlaylist.mockResolvedValue({ id: '1134543272', title: 'Hot Hits Tamil', owner: 'JioSaavn', isPublic: true, tracks: [] });

    const res = await request(app).get('/api/playlists/1134543272');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: '1134543272', title: 'Hot Hits Tamil', owner: 'JioSaavn' });
  });

  it('still 404s when JioSaavn has no such playlist either', async () => {
    prismaMock.playlist.findUnique.mockResolvedValue(null);
    saavnMock.getPlaylist.mockResolvedValue(null);

    const res = await request(app).get('/api/playlists/does-not-exist');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/playlists — only the signed-in user\'s playlists', () => {
  it("never includes other users' public playlists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(owner as any);
    prismaMock.playlist.findMany.mockResolvedValue([]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);
    prismaMock.listeningHistory.findMany.mockResolvedValue([]);
    prismaMock.playlistTrack.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/playlists').set('Authorization', bearerFor(owner));

    expect(res.status).toBe(200);
    expect(prismaMock.playlist.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: owner.id } }));
  });
});

describe('POST /api/playlists/import/spotify', () => {
  const PLAYLIST_ID = '37i9dQZF1DXcBWIGoYBM5M';
  const embedHtml = (entity: object) =>
    `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: { pageProps: { state: { data: { entity } } } },
    })}</script></html>`;
  const spotifyPage = {
    name: 'Road Trip',
    coverArt: { sources: [{ url: 'https://i.scdn.co/image/cover' }] },
    trackList: [
      { title: 'Hey Jude - Remastered 2015', subtitle: 'The Beatles', duration: 431000 },
      { title: 'Region Locked', subtitle: 'Someone', duration: 200000 },
      { title: 'Stay (with Justin Bieber)', subtitle: 'The Kid LAROI, Justin Bieber', duration: 141000 },
      { title: 'Hey Jude', subtitle: 'The Beatles', duration: 431000 },
    ],
  };
  let fetchSpy: jest.SpyInstance;

  const mockSpotify = (status: number, body = '') =>
    (fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(body, { status })));

  afterEach(() => fetchSpy?.mockRestore());

  it('rejects an unauthenticated request', async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent);
    const res = await agent.post('/api/playlists/import/spotify').set('x-csrf-token', csrfToken).send({ url: 'x' });
    expect(res.status).toBe(401);
  });

  it('rejects a link that is not a Spotify playlist, without fetching anything', async () => {
    mockSpotify(200);
    const res = await authedPost('/api/playlists/import/spotify', owner, { url: 'https://example.com/foo' });
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('404s when Spotify has no such (public) playlist', async () => {
    mockSpotify(404);
    const res = await authedPost('/api/playlists/import/spotify', owner, { url: `https://open.spotify.com/playlist/${PLAYLIST_ID}` });
    expect(res.status).toBe(404);
    expect(prismaMock.playlist.create).not.toHaveBeenCalled();
  });

  it('matches songs on JioSaavn and saves them in Spotify order, reporting the misses', async () => {
    mockSpotify(200, embedHtml(spotifyPage));
    saavnMock.findSongByDuration.mockImplementation(async (query: string) =>
      query.startsWith('Hey Jude') ? { id: 'saavn-jude' } : query.startsWith('Stay') ? { id: 'saavn-stay' } : null
    );
    prismaMock.playlist.create.mockResolvedValue({ id: 'pl-1', title: 'Road Trip', coverUrl: 'https://i.scdn.co/image/cover' } as any);

    // Only the playlist id is used: another host in the link can't redirect the fetch.
    const res = await authedPost('/api/playlists/import/spotify', owner, {
      url: `https://evil.example/playlist/${PLAYLIST_ID}?si=abc`,
    });

    expect(res.status).toBe(201);
    expect(fetchSpy).toHaveBeenCalledWith(`https://open.spotify.com/embed/playlist/${PLAYLIST_ID}`, expect.anything());

    // Titles are cleaned and the first artist is searched, with duration and artist for matching.
    expect(saavnMock.findSongByDuration).toHaveBeenCalledWith('Hey Jude The Beatles', 431, 'The Beatles');
    expect(saavnMock.findSongByDuration).toHaveBeenCalledWith('Stay The Kid LAROI', 141, 'The Kid LAROI');

    expect(res.body.data).toMatchObject({
      playlist: { id: 'pl-1', title: 'Road Trip', tracksCount: 2 },
      total: 4,
      unmatched: [{ title: 'Region Locked', artist: 'Someone' }],
    });
    expect(res.body.data.matched).toHaveLength(3);

    const { data } = prismaMock.playlist.create.mock.calls[0][0] as any;
    expect(data).toMatchObject({ title: 'Road Trip', coverUrl: 'https://i.scdn.co/image/cover', ownerId: owner.id });
    const created = data.tracks.create as { spotifyTrackId: string; addedAt: Date }[];
    // Duplicate "Hey Jude" saved once; order kept via increasing addedAt.
    expect(created.map((t) => t.spotifyTrackId)).toEqual(['saavn-jude', 'saavn-stay']);
    expect(created[0].addedAt.getTime()).toBeLessThan(created[1].addedAt.getTime());
  });

  it('refuses to create an empty playlist when nothing matches', async () => {
    mockSpotify(200, embedHtml(spotifyPage));
    saavnMock.findSongByDuration.mockResolvedValue(null);
    const res = await authedPost('/api/playlists/import/spotify', owner, { url: `spotify:playlist:${PLAYLIST_ID}` });
    expect(res.status).toBe(422);
    expect(prismaMock.playlist.create).not.toHaveBeenCalled();
  });

  it('treats a JioSaavn failure on one song as a miss, not a failed import', async () => {
    mockSpotify(200, embedHtml(spotifyPage));
    saavnMock.findSongByDuration.mockImplementation(async (query: string) => {
      if (query.startsWith('Stay')) throw new Error('upstream down');
      return query.startsWith('Hey Jude') ? { id: 'saavn-jude' } : null;
    });
    prismaMock.playlist.create.mockResolvedValue({ id: 'pl-2', title: 'Road Trip', coverUrl: null } as any);
    const res = await authedPost('/api/playlists/import/spotify', owner, { url: `https://open.spotify.com/playlist/${PLAYLIST_ID}` });
    expect(res.status).toBe(201);
    expect(res.body.data.unmatched.map((t: any) => t.title)).toEqual(['Region Locked', 'Stay (with Justin Bieber)']);
  });
});
