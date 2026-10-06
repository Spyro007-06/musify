import { ApiError } from '@utils/ApiError';
import { SaavnService } from './saavn.service';
import type { SourceTrack } from './spotifyImport.service';

/**
 * Reads the songs of a public playlist link from music apps other than
 * Spotify (which spotifyImport.service reads itself), from what each app's
 * public page or API already serves — no keys, no login.
 *
 * Only the hosts below are ever fetched (also after redirects), so a pasted
 * link can't point the server anywhere else. Apps whose pages load songs
 * with JavaScript only (Amazon Music, Wynk, SoundCloud) can't be read this
 * way; the import UI offers screenshots for those.
 */

export interface LinkTrack extends SourceTrack {
  /** A JioSaavn link's songs are already in our catalog: no matching needed. */
  saavnId?: string;
  /** The artist is a guess (from a video title): search with it, but don't reject other artists. */
  looseArtist?: boolean;
}

export interface LinkPlaylist {
  /** The app's name, for "Imported from …". */
  source: string;
  title: string;
  coverUrl: string | null;
  tracks: LinkTrack[];
  /** Songs the playlist has beyond those its page/API gave us. */
  missing: number;
}

/** ponytail: like Spotify's embed, at most this many per link; the rest go in by screenshots. */
export const LINK_TRACK_LIMIT = 100;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

interface Reader {
  source: string;
  hosts: RegExp;
  read: (url: URL) => Promise<Omit<LinkPlaylist, 'source'>>;
}

const READERS: Reader[] = [
  { source: 'JioSaavn', hosts: /(^|\.)jiosaavn\.com$/, read: readJioSaavn },
  { source: 'Deezer', hosts: /(^|\.)deezer\.com$|^(dzr|deezer)\.page\.link$/, read: readDeezer },
  { source: 'YouTube', hosts: /(^|\.)youtube\.com$|^youtu\.be$/, read: readYouTube },
  { source: 'Apple Music', hosts: /^(music|embed\.music)\.apple\.com$/, read: readAppleMusic },
  { source: 'Gaana', hosts: /(^|\.)gaana\.com$/, read: (url) => readJsonLdPage(url, /(^|\.)gaana\.com$/) },
];

const SUPPORTED = 'Spotify, YouTube, YouTube Music, Apple Music, JioSaavn, Deezer and Gaana';

/** The reader for this link's app, or a 400 naming the apps that work. */
export function readerFor(url: URL): Reader {
  const reader = READERS.find((r) => r.hosts.test(url.hostname.toLowerCase()));
  if (!reader || url.protocol !== 'https:') {
    throw ApiError.badRequest(`Links from that app can't be read yet. Try ${SUPPORTED}, or import screenshots instead.`);
  }
  return reader;
}

export async function readPlaylistLink(url: URL): Promise<LinkPlaylist> {
  const reader = readerFor(url);
  const playlist = await reader.read(url);
  if (playlist.tracks.length === 0) {
    throw ApiError.unprocessable(`No songs could be read from that ${reader.source} link. Is the playlist public?`);
  }
  return { source: reader.source, ...playlist, tracks: playlist.tracks.slice(0, LINK_TRACK_LIMIT) };
}

/** GETs a page, following redirects only while they stay on the app's own hosts. */
export async function fetchFrom(url: string, hosts: RegExp, accept = 'text/html'): Promise<{ url: string; body: string }> {
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en', Accept: accept },
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, url);
      if (next.protocol !== 'https:' || !hosts.test(next.hostname)) throw ApiError.badRequest('That link goes somewhere unexpected.');
      url = next.href;
      continue;
    }
    if (res.status === 404) throw ApiError.notFound('Playlist not found. Is it public?');
    if (!res.ok) throw ApiError.internal(`The music app returned ${res.status}.`);
    return { url, body: await res.text() };
  }
  throw ApiError.badRequest('That link redirects too many times.');
}

const firstArtist = (names: string) => names.split(/,|&| x | feat\.? | ft\.? /i)[0].trim();

/** "PT3M38S" (schema.org) → 218. */
export function isoDurationSec(iso: unknown): number | undefined {
  const m = typeof iso === 'string' ? iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/) : null;
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : undefined;
}

/** Every JSON object in the page's <script type="application/ld+json"> blocks, @graph flattened. */
function jsonLdObjects(html: string): any[] {
  const out: any[] = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
    try {
      const json = JSON.parse(m[1]);
      for (const o of Array.isArray(json) ? json : [json]) out.push(o, ...(Array.isArray(o?.['@graph']) ? o['@graph'] : []));
    } catch {
      // A malformed block: skip it.
    }
  }
  return out;
}

/** A schema.org MusicRecording (name, byArtist, duration) as a song to find. */
function recordingTrack(t: any): LinkTrack {
  const by = Array.isArray(t.byArtist) ? t.byArtist[0] : t.byArtist;
  return { title: String(t.name).trim(), artist: firstArtist(String(by?.name ?? '')), durationSec: isoDurationSec(t.duration) };
}

/**
 * schema.org's MusicPlaylist, which many music sites embed for search
 * engines: name, numTracks, and track[] of MusicRecording (name, byArtist,
 * duration). Some list items as ItemList → itemListElement[].item.
 */
export function parseJsonLdPlaylist(html: string): Omit<LinkPlaylist, 'source'> | null {
  const playlist = jsonLdObjects(html).find((o) => o?.['@type'] === 'MusicPlaylist');
  if (!playlist) return null;
  const raw = playlist.track?.itemListElement ?? playlist.track ?? [];
  const tracks: LinkTrack[] = (Array.isArray(raw) ? raw : [raw])
    .map((t: any) => t?.item ?? t)
    .filter((t: any) => typeof t?.name === 'string' && t.name.trim())
    .map(recordingTrack);
  return {
    title: String(playlist.name || 'Imported playlist').slice(0, 100),
    coverUrl: typeof playlist.image === 'string' ? playlist.image : (playlist.image?.url ?? null),
    tracks,
    missing: Math.max(0, (Number(playlist.numTracks) || 0) - tracks.length),
  };
}

async function readJsonLdPage(url: URL, hosts: RegExp) {
  const { body } = await fetchFrom(url.href, hosts);
  const playlist = parseJsonLdPlaylist(body);
  if (!playlist) throw ApiError.unprocessable('Could not find a playlist on that page.');
  return playlist;
}

/**
 * Apple's JSON-LD has no artists, but the page's own data
 * (serialized-server-data) lists each song with title, artistName and
 * duration (ms), so that's read first; JSON-LD is the fallback.
 */
export function parseApplePlaylist(html: string): Omit<LinkPlaylist, 'source'> | null {
  const ld = parseJsonLdPlaylist(html);
  const json = html.match(/<script[^>]*id="serialized-server-data"[^>]*>(.*?)<\/script>/s)?.[1];
  const tracks: LinkTrack[] = [];
  const walk = (o: any) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    if (typeof o.title === 'string' && typeof o.artistName === 'string' && typeof o.duration === 'number') {
      tracks.push({ title: o.title, artist: firstArtist(o.artistName), durationSec: Math.round(o.duration / 1000) });
      return;
    }
    Object.values(o).forEach(walk);
  };
  try {
    if (json) walk(JSON.parse(json));
  } catch {
    // Unreadable: JSON-LD below.
  }
  if (tracks.length === 0) return ld;
  return {
    title: ld?.title ?? 'Imported playlist',
    coverUrl: ld?.coverUrl ?? null,
    tracks,
    missing: ld ? Math.max(0, ld.tracks.length + ld.missing - tracks.length) : 0,
  };
}

async function readAppleMusic(url: URL) {
  const { body } = await fetchFrom(url.href, /^(music|embed\.music)\.apple\.com$/);
  const playlist = parseApplePlaylist(body);
  if (!playlist) throw ApiError.unprocessable('Could not find a playlist on that page.');
  return playlist;
}

async function readJioSaavn(url: URL) {
  // jiosaavn.com/featured/<name>/<token> or /s/playlist/<…>/<name>/<token>
  const token = url.pathname.split('/').filter(Boolean).pop();
  if (!token || !/playlist|featured/.test(url.pathname)) throw ApiError.badRequest('That is not a JioSaavn playlist link.');
  const p = await SaavnService.getInstance().getPlaylistByLinkToken(token, LINK_TRACK_LIMIT);
  if (!p) throw ApiError.notFound('Playlist not found. Is it public?');
  return {
    title: p.title.slice(0, 100) || 'Imported playlist',
    coverUrl: p.cover,
    tracks: p.tracks.map((t: any) => ({
      title: t.title,
      artist: t.artists?.[0]?.name ?? '',
      durationSec: t.duration,
      saavnId: t.id,
    })),
    missing: Math.max(0, p.total - p.tracks.length),
  };
}

const DEEZER_HOSTS = /(^|\.)deezer\.com$|^(dzr|deezer)\.page\.link$/;

async function readDeezer(url: URL) {
  // Short share links (link.deezer.com/s/…) redirect to the real one.
  let id = url.pathname.match(/playlist\/(\d+)/)?.[1];
  if (!id) id = (await fetchFrom(url.href, DEEZER_HOSTS)).url.match(/playlist\/(\d+)/)?.[1];
  if (!id) throw ApiError.badRequest('That is not a Deezer playlist link.');

  const { body } = await fetchFrom(`https://api.deezer.com/playlist/${id}`, /^api\.deezer\.com$/, 'application/json');
  const p = JSON.parse(body);
  if (p.error) throw ApiError.notFound('Playlist not found. Is it public?');
  const tracks: LinkTrack[] = (p.tracks?.data ?? []).map((t: any) => ({
    title: t.title,
    artist: t.artist?.name ?? '',
    durationSec: t.duration,
  }));
  return {
    title: String(p.title || 'Imported playlist').slice(0, 100),
    coverUrl: p.picture_xl ?? null,
    tracks,
    missing: Math.max(0, (Number(p.nb_tracks) || 0) - tracks.length),
  };
}

/**
 * "Arijit Singh - Tum Hi Ho (Official Video)" → title + artist; Indian film
 * uploads are "Tum Hi Ho | Aashiqui 2 | Arijit Singh" → the first part.
 * Video lengths differ from the songs (intros, outros), so no duration:
 * the matcher then checks the title instead.
 */
export function parseYouTubeTitle(raw: string, channel = ''): LinkTrack {
  let text = raw
    .split(/\s+\|\s+/)[0]
    .replace(/\s*[([][^)\]]*\b(official|video|audio|lyrics?|visuali[sz]er|full song|hd|4k|mv)\b[^)\]]*[)\]]/gi, '')
    // Unbracketed too ("OFFICIAL MUSIC VIDEO", "- Full Song"); a bare "Video" stays ("Video Games").
    .replace(/\b(official\s+(music\s+)?|music\s+|lyric(al)?\s+|full\s+)(video|audio)(\s+song)?\b|\b(full\s+song|lyrical|visuali[sz]er)\b|\b(official\s+)?m\/?v\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—]+|[\s\-–—]+$/g, '')
    .trim();
  let artist = channel.replace(/\s*-\s*Topic$|VEVO$/i, '').trim();
  // K-pop style: ARTIST (한글) 'Title' — the quotes need a space before, so "Don't" isn't one.
  const quoted = text.match(/^(.+?)\s+['"‘“](.+?)['"’”](\s|$)/);
  const dash = text.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (quoted) {
    artist = quoted[1].replace(/\s*\([^)]*\)/g, '').trim();
    text = quoted[2].trim();
  } else if (dash) {
    artist = firstArtist(dash[1]);
    text = dash[2].trim();
  }
  // "X - Y" may be "Movie - Song" just as well: the artist only steers the search.
  return { title: text, artist, looseArtist: true };
}

/** The playlist's rows from YouTube's ytInitialData: the newer lockupViewModel, or the older playlistVideoRenderer. */
export function parseYouTubePlaylist(html: string): Omit<LinkPlaylist, 'source'> | null {
  const start = html.indexOf('var ytInitialData = ');
  if (start === -1) return null;
  const from = start + 'var ytInitialData = '.length;
  let data: any;
  try {
    data = JSON.parse(html.slice(from, html.indexOf(';</script>', from)));
  } catch {
    return null;
  }
  const tracks: LinkTrack[] = [];
  const walk = (o: any) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (!o || typeof o !== 'object') return;
    const lockup = o.lockupViewModel;
    if (lockup?.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
      const title = lockup.metadata?.lockupMetadataViewModel?.title?.content;
      if (title) tracks.push(parseYouTubeTitle(title));
      return;
    }
    const legacy = o.playlistVideoRenderer;
    if (legacy) {
      const title = legacy.title?.runs?.[0]?.text;
      if (title) tracks.push(parseYouTubeTitle(title, legacy.shortBylineText?.runs?.[0]?.text));
      return;
    }
    Object.values(o).forEach(walk);
  };
  walk(data.contents);
  return {
    title: String(data.metadata?.playlistMetadataRenderer?.title || 'Imported playlist').slice(0, 100),
    coverUrl: null,
    tracks: tracks.filter((t) => t.title),
    missing: 0, // ponytail: the page holds the first 100; more would need YouTube's continuation calls
  };
}

async function readYouTube(url: URL) {
  // youtube.com/playlist?list=…, music.youtube.com/playlist?list=…, or a video played from a playlist.
  const list = url.searchParams.get('list');
  if (!list || !/^[A-Za-z0-9_-]+$/.test(list)) throw ApiError.badRequest('That is not a YouTube playlist link.');
  const { body } = await fetchFrom(`https://www.youtube.com/playlist?list=${list}&hl=en`, /(^|\.)youtube\.com$/);
  const playlist = parseYouTubePlaylist(body);
  if (!playlist) throw ApiError.unprocessable('Could not read that YouTube playlist. Is it public?');
  return playlist;
}

const notASong = () => ApiError.badRequest('Share a link to a song or a playlist.');

/**
 * One song from a link shared to Musify (Android's share sheet), read from
 * its app's public data; null when the link is a playlist instead. Spotify
 * links are read by spotifyImport.service. Albums, artists and the like: 400.
 */
export async function readSongLink(url: URL): Promise<LinkTrack | null> {
  const { source } = readerFor(url); // the same host allowlist, https only
  let path = url.pathname;
  switch (source) {
    case 'YouTube': {
      // watch?v=…, music.youtube.com/watch?v=…, youtu.be/…, /shorts/…
      const id = url.searchParams.get('v') ?? path.match(/^\/(?:shorts\/)?([\w-]{11})$/)?.[1];
      if (!id) {
        if (url.searchParams.has('list')) return null;
        throw notASong();
      }
      const video = `https://www.youtube.com/watch?v=${id}`;
      const { body } = await fetchFrom(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(video)}`,
        /(^|\.)youtube\.com$/,
        'application/json'
      );
      const { title, author_name: channel } = JSON.parse(body);
      return parseYouTubeTitle(String(title ?? ''), String(channel ?? ''));
    }
    case 'JioSaavn': {
      if (/\/(playlist|featured)\//.test(path)) return null;
      if (!path.includes('/song/')) throw notASong();
      const song = await SaavnService.getInstance().getSongByLinkToken(path.split('/').filter(Boolean).pop()!);
      if (!song) throw ApiError.notFound('Song not found.');
      return { title: song.title, artist: song.artists?.[0]?.name ?? '', durationSec: song.duration, saavnId: song.id };
    }
    case 'Deezer': {
      // Short share links (link.deezer.com/s/…) redirect to the real one.
      if (!/\/(track|playlist)\//.test(path)) path = new URL((await fetchFrom(url.href, DEEZER_HOSTS)).url).pathname;
      if (path.includes('/playlist/')) return null;
      const id = path.match(/\/track\/(\d+)/)?.[1];
      if (!id) throw notASong();
      const t = JSON.parse((await fetchFrom(`https://api.deezer.com/track/${id}`, /^api\.deezer\.com$/, 'application/json')).body);
      if (t.error) throw ApiError.notFound('Song not found.');
      return { title: t.title, artist: t.artist?.name ?? '', durationSec: t.duration };
    }
    case 'Apple Music': {
      // music.apple.com/in/album/…?i=<song id> or /in/song/…/<song id>; looked up in that country's store.
      const id = url.searchParams.get('i') ?? (path.includes('/song/') ? path.split('/').pop() : undefined);
      if (!id || !/^\d+$/.test(id)) {
        if (path.includes('/playlist/')) return null;
        throw notASong();
      }
      const country = path.split('/')[1];
      const lookup = `https://itunes.apple.com/lookup?id=${id}${/^[a-z]{2}$/.test(country) ? `&country=${country}` : ''}`;
      const r = JSON.parse((await fetchFrom(lookup, /^itunes\.apple\.com$/, 'application/json')).body).results?.[0];
      if (!r?.trackName) throw ApiError.notFound('Song not found.');
      return { title: r.trackName, artist: firstArtist(String(r.artistName ?? '')), durationSec: Math.round((r.trackTimeMillis ?? 0) / 1000) };
    }
    case 'Gaana': {
      if (path.includes('/playlist/')) return null;
      if (!path.includes('/song/')) throw notASong();
      const { body } = await fetchFrom(url.href, /(^|\.)gaana\.com$/);
      const recording = jsonLdObjects(body).find((o) => o?.['@type'] === 'MusicRecording');
      if (!recording?.name) throw ApiError.notFound('Song not found.');
      return recordingTrack(recording);
    }
    default:
      throw notASong();
  }
}
