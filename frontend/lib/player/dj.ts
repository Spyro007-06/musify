import type { Track } from '@/types/track';

/**
 * The DJ: a short spoken intro as the next song starts, in the phone's own
 * voice (speechSynthesis: no AI call, no network, works offline). Only
 * type imports here, so the self-check below runs on this very file.
 */

/** Talks on every other song: an intro on every song wears thin fast. */
const EVERY_NTH_SONG = 2;
/** Music at a quarter of its volume while the DJ talks. */
const DUCK = 0.25;
/** Restores the music even if the speech engine never reports the end. */
const MAX_TALK_MS = 10_000;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A radio-style intro from the song's details, e.g. "A 2013 Hindi classic
 * now: Tum Hi Ho, from Aashiqui 2." `pick` chooses among the lines that fit.
 */
export function djLine(track: Track, thisYear = new Date().getFullYear(), pick = Math.random): string {
  // 'Tum Hi Ho (From "Aashiqui 2")' → the song is "Tum Hi Ho", the film "Aashiqui 2".
  const film = track.title.match(/^(.*?)\s*\(From\s+["“]?([^"”)]+?)["”]?\)\s*$/i);
  const title = (film?.[1] ?? track.title).trim();
  const album = film?.[2] ?? track.album?.title;
  const fromAlbum = album && album.toLowerCase() !== title.toLowerCase() ? album : ''; // a single's "album" is the song
  // The singers when the catalog says who they are: its artists list often starts with the composer or lyricist.
  const artist = (track.performers?.length ? track.performers : (track.artists ?? []))
    .map((a) => a.name)
    .filter((n) => n && n !== 'Unknown Artist')
    .slice(0, 2)
    .join(' and ');
  const year = track.album?.releaseYear;
  const language = track.genre ? `${cap(track.genre)} ` : '';

  const lines = [`Up next: ${title}${artist ? `, by ${artist}` : ''}.`];
  if (artist) lines.push(`Here's ${artist} with ${title}.`);
  if (fromAlbum) lines.push(`From ${fromAlbum}${year ? `, ${year}` : ''}: ${title}.`);
  if (year && year <= thisYear - 10) lines.push(`A ${year} ${language}classic now: ${title}${fromAlbum ? `, from ${fromAlbum}` : ''}.`);
  // This year only: re-releases often carry a later year than the original.
  if (year && year === thisYear) lines.push(`Something new${artist ? ` from ${artist}` : ''}: ${title}.`);
  return lines[Math.min(lines.length - 1, Math.floor(pick() * lines.length))];
}

let songsSinceIntro = EVERY_NTH_SONG; // the first song that qualifies gets an intro

/** An Indian English voice when the phone has one, else any English one. */
function voice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.replace('_', '-') === 'en-IN') ?? voices.find((v) => v.lang.startsWith('en')) ?? null;
}

/**
 * Speaks the intro for a song that just started by itself (not one the
 * listener picked). setMusicVolume dips the music while it talks;
 * musicVolume says what to restore (it may change meanwhile).
 */
export function introduce(track: Track, setMusicVolume: (volume: number) => void, musicVolume: () => number) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (++songsSinceIntro < EVERY_NTH_SONG) return;
  songsSinceIntro = 0;

  const speech = new SpeechSynthesisUtterance(djLine(track));
  const v = voice();
  if (v) speech.voice = v;
  speech.lang = v?.lang ?? 'en-IN';

  let done = false;
  const restore = () => {
    if (done) return;
    done = true;
    setMusicVolume(musicVolume());
  };
  speech.onend = restore;
  speech.onerror = restore;
  setTimeout(restore, MAX_TALK_MS);

  setMusicVolume(musicVolume() * DUCK);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(speech);
}

/** Cuts an intro short: the listener paused or picked another song (its onerror restores the music). */
export function hush() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** Self-check: `node --experimental-strip-types lib/player/dj.ts` */
// (Browsers get a stub `process` without argv, hence the ?. guards.)
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('dj.ts')) {
  const song = (title: string, extra: Partial<Track> = {}) => ({ id: 'x', title, artists: [{ id: 'a', name: 'Arijit Singh' }], ...extra }) as Track;
  const all = (t: Track) => Array.from({ length: 10 }, (_, i) => djLine(t, 2026, () => i / 10));
  const check = (ok: boolean, what: string) => {
    if (!ok) throw new Error(`dj self-check failed: ${what}`);
  };

  const film = all(song('Tum Hi Ho (From "Aashiqui 2")', { genre: 'hindi', album: { id: 'al', title: 'Aashiqui 2', releaseYear: 2013 } as Track['album'] }));
  check(film.includes('A 2013 Hindi classic now: Tum Hi Ho, from Aashiqui 2.'), 'old film song is a classic, with its film');
  check(film.every((l) => !l.includes('(From')), 'the "(From …)" tag is never read out');
  check(!all(song('Fresh', { album: { id: 'al', title: 'Fresh', releaseYear: 2026 } as Track['album'] })).some((l) => l.startsWith('From Fresh')), "a single's album isn't announced");
  check(all(song('Fresh', { album: { id: 'al', title: 'Fresh', releaseYear: 2026 } as Track['album'] })).includes('Something new from Arijit Singh: Fresh.'), 'new release');
  check(all({ id: 'x', title: 'Untitled', artists: [{ id: 'u', name: 'Unknown Artist' }] } as Track).every((l) => l === 'Up next: Untitled.'), 'no artist: plain intro');
  const credited = all(song('O Maahi', { artists: [{ id: 'k', name: 'Irshad Kamil' }, { id: 'p', name: 'Pritam' }], performers: [{ id: 'a', name: 'Arijit Singh' }] }));
  check(credited.includes("Here's Arijit Singh with O Maahi.") && credited.every((l) => !l.includes('Irshad')), 'the singer, not the lyricist');
  check(!all(song('Dunki song', { album: { id: 'al', title: 'Dunki', releaseYear: 2025 } as Track['album'] })).some((l) => l.startsWith('Something new')), 'last year is not "new"');
  console.log('dj self-check passed');
}
