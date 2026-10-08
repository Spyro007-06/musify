import '../tests/setup/saavnMock';
import webpush from 'web-push';
import { env } from '@config/env';
import { isRelease, runReleaseAlerts } from '@services/releaseAlerts.service';
import { prismaMock } from './setup/prismaMock';
import { saavnMock } from './setup/saavnMock';

jest.mock('web-push', () => ({ __esModule: true, default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() } }));
const sendNotification = webpush.sendNotification as jest.Mock;

// Shaped like the catalog SDK's artist songs, from real "latest" lists.
const ARIJIT = { id: '459320', name: 'Arijit Singh' };
const song = (name: string, album: string, copyright: string, extra: Record<string, unknown> = {}) => ({
  id: `id-${name}`,
  name,
  year: '2026',
  copyright,
  album: { id: `album-${album}`, name: album },
  artists: { primary: [ARIJIT, { id: '1', name: 'Pritam' }] },
  image: [{ quality: '50x50', url: 'small.jpg' }, { quality: '500x500', url: 'big.jpg' }],
  ...extra,
});

const single = song('Raat Ki Rani', 'Raat Ki Rani', '© 2026 Zee Music Company');
const filmSingle = song('Jai Ambe Bol (From &quot;Yeh Prem Mol Liya&quot;)', 'Jai Ambe Bol (From &quot;Yeh Prem Mol Liya&quot;)', '© 2026 Himesh Reshammiya Melodies');
const onFilmAlbum = song('Gehra Hua (From &quot;Dhurandhar&quot;)', 'Dhurandhar', '℗ 2026 Saregama');

describe('isRelease', () => {
  it('keeps the artist’s own new singles and film songs', () => {
    expect(isRelease(single, ARIJIT.id, 2026)).toBe(true);
    expect(isRelease(filmSingle, ARIJIT.id, 2026)).toBe(true);
    expect(isRelease(onFilmAlbum, ARIJIT.id, 2026)).toBe(true);
  });

  it('skips compilations, re-releases, versions and other people’s songs', () => {
    expect(isRelease(song('Dekha Hazaro Dafaa', 'Love Anthems', '© 2026 Zee Music Company'), ARIJIT.id, 2026)).toBe(false);
    expect(isRelease(song('Naan Un (From &quot;24&quot;)', 'A.R. Rahman Romantic Hits', '(P) 2016 Sony Music Entertainment India Pvt. Ltd'), ARIJIT.id, 2026)).toBe(false);
    expect(isRelease(song('Aa Jao Na Lofi Mix', 'Aa Jao Na Lofi Mix', '© 2026 Zee Music Company'), ARIJIT.id, 2026)).toBe(false);
    expect(isRelease(song('Tauba Tauba Eclipsa Audio', 'Tauba Tauba Eclipsa Audio', '℗ 2026 Saregama India Ltd'), ARIJIT.id, 2026)).toBe(false);
    expect(isRelease(song('Khairiyat - Arijit Singh Vocals Only', 'Khairiyat - Arijit Singh Vocals Only', '© 2026 Zee Music Company'), ARIJIT.id, 2026)).toBe(false);
    expect(isRelease(song('Dil Ki Hasrat', 'Dil Ki Hasrat', '© 2026 Lambi Roy', { artists: { primary: [{ id: '9', name: 'Lambi Roy' }] } }), ARIJIT.id, 2026)).toBe(false);
  });

  it('counts last year’s songs (a release just before New Year), not older ones', () => {
    expect(isRelease({ ...single, year: '2025', copyright: '© 2025 Zee' }, ARIJIT.id, 2026)).toBe(true);
    expect(isRelease({ ...single, year: '2024', copyright: '© 2024 Zee' }, ARIJIT.id, 2026)).toBe(false);
  });
});

describe('runReleaseAlerts', () => {
  const device = { id: 'd1', userId: 'u1', endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: 'p', auth: 'a', createdAt: new Date() };

  beforeEach(() => {
    env.VAPID_PUBLIC_KEY = 'public';
    env.VAPID_PRIVATE_KEY = 'private';
    prismaMock.artistAffinity.findMany.mockResolvedValue([{ artistId: ARIJIT.id, userId: 'u1' }] as any);
    prismaMock.pushSubscription.findMany.mockResolvedValue([device] as any);
    sendNotification.mockResolvedValue({ statusCode: 201 });
  });
  afterEach(() => {
    env.VAPID_PUBLIC_KEY = '';
    env.VAPID_PRIVATE_KEY = '';
  });

  it('is off without keys', async () => {
    env.VAPID_PRIVATE_KEY = '';
    await expect(runReleaseAlerts()).rejects.toMatchObject({ statusCode: 501 });
  });

  it('only remembers what an artist already has the first time', async () => {
    saavnMock.getArtistLatestSongs.mockResolvedValue([single]);
    prismaMock.artistReleaseCheck.findUnique.mockResolvedValue(null);

    expect(await runReleaseAlerts(new Date('2026-10-08'))).toMatchObject({ artists: 1, announced: 0 });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(prismaMock.artistReleaseCheck.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { artistId: ARIJIT.id, songIds: [single.id] } }));
  });

  it('announces a song that appeared since the last check, to every device of every fan', async () => {
    const compilation = song('Ve Maahi', 'Love Anthems', '© 2026 Zee Music Company');
    saavnMock.getArtistLatestSongs.mockResolvedValue([filmSingle, compilation, single]);
    prismaMock.artistReleaseCheck.findUnique.mockResolvedValue({ artistId: ARIJIT.id, songIds: [single.id], checkedAt: new Date() });

    expect(await runReleaseAlerts(new Date('2026-10-08'))).toMatchObject({ announced: 1, delivered: 1 });
    expect(sendNotification).toHaveBeenCalledTimes(1);
    const [subscription, payload] = sendNotification.mock.calls[0];
    expect(subscription).toEqual({ endpoint: device.endpoint, keys: { p256dh: 'p', auth: 'a' } });
    expect(JSON.parse(payload)).toEqual({
      title: 'New from Arijit Singh',
      body: 'Jai Ambe Bol (From "Yeh Prem Mol Liya")',
      image: 'big.jpg',
      url: `/albums/${filmSingle.album.id}`,
      tag: `release-${filmSingle.id}`,
    });
    // Everything on the page is remembered, so nothing here is announced again.
    expect(prismaMock.artistReleaseCheck.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { songIds: [filmSingle.id, compilation.id, single.id] } })
    );
  });

  it('sends one alert for a song released in several languages', async () => {
    const tamil = song('Bindaas (From &quot;Jailer 2&quot;)', 'Bindaas (From &quot;Jailer 2&quot;)', '(P) 2026 Sun Pictures');
    const telugu = song('Bindaas (From &quot;Rajini The Jailer 2&quot;)', 'Bindaas (From &quot;Rajini The Jailer 2&quot;)', '(P) 2026 Sun Pictures');
    saavnMock.getArtistLatestSongs.mockResolvedValue([tamil, telugu]);
    prismaMock.artistReleaseCheck.findUnique.mockResolvedValue({ artistId: ARIJIT.id, songIds: [], checkedAt: new Date() });

    expect(await runReleaseAlerts(new Date('2026-10-08'))).toMatchObject({ announced: 1 });
    expect(JSON.parse(sendNotification.mock.calls[0][1]).tag).toBe(`release-${tamil.id}`);
  });

  it('forgets a device the push service says is gone, and carries on past an unreachable artist', async () => {
    prismaMock.artistAffinity.findMany.mockResolvedValue([
      { artistId: 'down', userId: 'u1' },
      { artistId: ARIJIT.id, userId: 'u1' },
    ] as any);
    saavnMock.getArtistLatestSongs.mockImplementation(async (id: string) => {
      if (id === 'down') throw new Error('catalog down');
      return [single];
    });
    prismaMock.artistReleaseCheck.findUnique.mockResolvedValue({ artistId: ARIJIT.id, songIds: [], checkedAt: new Date() });
    sendNotification.mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 }));

    expect(await runReleaseAlerts(new Date('2026-10-08'))).toMatchObject({ artists: 2, unreachable: 1, announced: 1, delivered: 0 });
    expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });
});
