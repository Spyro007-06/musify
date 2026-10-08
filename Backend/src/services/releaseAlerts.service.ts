import webpush from 'web-push';
import { prisma } from '@config/database';
import { env } from '@config/env';
import { HTTP_STATUS } from '@constants/httpCodes';
import { ApiError } from '@utils/ApiError';
import { logger } from '@utils/logger';
import { unescapeHtml } from '@utils/unescapeHtml';
import { SaavnService } from './saavn.service';

/**
 * New-release alerts. For each artist that someone with alerts on follows,
 * read the artist's latest catalog songs and push the ones that weren't
 * there at the last check (ArtistReleaseCheck); an artist's first check
 * only remembers what's there. The catalog's "latest" is mostly label
 * compilations, lo-fi mixes and covers listed under the artist, so
 * isRelease keeps just the artist's own new singles and film songs.
 */

const saavn = SaavnService.getInstance();
const MAX_ALERTS_PER_ARTIST = 3; // per run; any more are remembered, not sent
const REMEMBERED_SONGS = 100;

const DERIVATIVE = /\b(lo ?fi|remix|slowed|reverb|sped up|mashup|vocals only|cover|8d|karaoke|instrumental|eclipsa audio|dolby atmos|spatial audio)\b/;
const norm = (s?: string) => unescapeHtml(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const withoutFilm = (name: string) => norm(unescapeHtml(name).replace(/\(From "[^"]*"\)/i, ''));

/** One of the artist's own new songs: not a re-release, compilation or remix. `song` as the catalog SDK returns it. */
export function isRelease(song: any, artistId: string, thisYear: number): boolean {
  if (!song?.artists?.primary?.some((a: any) => a.id === artistId)) return false;
  const year = Number(song.year);
  // A re-released song keeps its first year: "(P) 2016 Sony Music…" on a 2026 compilation.
  const firstYear = Number(String(song.copyright ?? '').match(/(?:℗|\(p\)|©|\(c\))\s*(\d{4})/i)?.[1] ?? year);
  if (!(year >= thisYear - 1 && firstYear >= thisYear - 1)) return false;
  const title = norm(song.name);
  if (DERIVATIVE.test(title)) return false;
  // A single ('Gehra Hua (From "Dhurandhar")' on its own) or its film's album; compilations ("Love Anthems") are neither.
  const album = norm(song.album?.name);
  const film = norm(unescapeHtml(song.name).match(/\(From "([^"]+)"\)/i)?.[1]);
  return album === title || (film !== '' && (album === film || album.startsWith(`${film} `)));
}

let vapidSet = false;
function vapidReady(): boolean {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return false;
  if (!vapidSet) {
    // Push services want a contact address; Apple's rejects a localhost one.
    const contact = env.FRONTEND_URL.startsWith('https://') ? env.FRONTEND_URL : 'https://musify-adv.vercel.app';
    webpush.setVapidDetails(contact, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    vapidSet = true;
  }
  return true;
}

function alertFor(song: any, artistId: string) {
  const artist = song.artists.primary.find((a: any) => a.id === artistId);
  return {
    title: `New from ${unescapeHtml(artist?.name)}`,
    body: unescapeHtml(song.name),
    image: song.image?.[song.image.length - 1]?.url,
    url: song.album?.id ? `/albums/${song.album.id}` : `/artists/${artistId}`,
    tag: `release-${song.id}`, // a duet announced for both singers shows once
  };
}

/** Sends one alert to every device of these users; forgets devices the push service says are gone. Returns how many got it. */
async function push(userIds: string[], alert: object): Promise<number> {
  const devices = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  const payload = JSON.stringify(alert);
  const delivered = await Promise.all(
    devices.map((d) =>
      webpush
        .sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: 24 * 60 * 60 })
        .then(() => 1)
        .catch(async (err) => {
          // 404/410: alerts turned off in the browser, or the app uninstalled. It won't come back.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await prisma.pushSubscription.deleteMany({ where: { id: d.id } });
          } else {
            logger.warn(`Release alert not delivered: ${err?.statusCode ?? ''} ${err?.body ?? err?.message ?? err}`);
          }
          return 0;
        })
    )
  );
  return delivered.reduce((a, b) => a + b, 0);
}

let running = false;

/** One pass over the followed artists. The scheduled GitHub Action calls it a few times a day. */
export async function runReleaseAlerts(now = new Date()) {
  if (!vapidReady()) throw new ApiError(HTTP_STATUS.NOT_IMPLEMENTED, 'Release alerts are not set up (VAPID keys are missing).');
  if (running) return { alreadyRunning: true };
  running = true;
  try {
    const follows = await prisma.artistAffinity.findMany({
      where: { isFollowed: true, user: { pushSubscriptions: { some: {} } } },
      select: { artistId: true, userId: true },
    });
    const fans = new Map<string, string[]>();
    for (const f of follows) fans.set(f.artistId, [...(fans.get(f.artistId) ?? []), f.userId]);

    const result = { artists: fans.size, unreachable: 0, announced: 0, delivered: 0 };
    // ponytail: one artist at a time (one catalog call each); a small worker pool if follows grow into the thousands.
    for (const [artistId, userIds] of fans) {
      const songs = await saavn.getArtistLatestSongs(artistId).catch(() => null);
      if (!songs) {
        result.unreachable++;
        continue;
      }
      const seen = await prisma.artistReleaseCheck.findUnique({ where: { artistId } });
      const fresh = seen ? songs.filter((s) => !seen.songIds.includes(s.id) && isRelease(s, artistId, now.getFullYear())) : [];
      // One alert per song: language versions share a title ('Bindaas (From "Jailer 2")', 'Bindaas (From "Rajini The Jailer 2")').
      const titles = new Set<string>();
      const newSongs = fresh.filter((s) => !titles.has(withoutFilm(s.name)) && titles.add(withoutFilm(s.name)));
      const songIds = [...new Set([...songs.map((s) => s.id), ...(seen?.songIds ?? [])])].slice(0, REMEMBERED_SONGS);
      await prisma.artistReleaseCheck.upsert({ where: { artistId }, create: { artistId, songIds }, update: { songIds } });

      for (const song of newSongs.slice(0, MAX_ALERTS_PER_ARTIST)) {
        result.announced++;
        result.delivered += await push(userIds, alertFor(song, artistId));
      }
    }
    logger.info(`Release alerts: ${JSON.stringify(result)}`);
    return result;
  } finally {
    running = false;
  }
}
