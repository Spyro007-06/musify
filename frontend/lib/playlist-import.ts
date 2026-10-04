import { playlistsApi, ImportSong } from '@/lib/api/playlists';
import { ApiError } from '@/types/api';

/** The server takes at most this many songs per request. */
const BATCH_SIZE = 25;

/** Every Spotify track id in pasted text (Spotify's "Copy" puts one link per song). */
export function parseSpotifyTrackIds(text: string): string[] {
  return [...new Set([...text.matchAll(/track[/:]([A-Za-z0-9]{22})/g)].map((m) => m[1]))];
}

export interface BatchImportResult {
  added: number;
  unmatched: ImportSong[];
  /** Songs not sent because a batch kept failing; the rest can be retried (duplicates are skipped). */
  notSent: number;
}

/**
 * Adds songs to a playlist 25 at a time, so each request stays short, and
 * reports progress. A failed batch is retried once (the backend may be
 * waking up); if it fails again, stop and report what's left.
 */
export async function importInBatches(
  playlistId: string,
  { spotifyIds = [], songs = [] }: { spotifyIds?: string[]; songs?: ImportSong[] },
  onProgress: (done: number, total: number) => void
): Promise<BatchImportResult> {
  const batches: { spotifyIds?: string[]; songs?: ImportSong[] }[] = [];
  for (let i = 0; i < spotifyIds.length; i += BATCH_SIZE) batches.push({ spotifyIds: spotifyIds.slice(i, i + BATCH_SIZE) });
  for (let i = 0; i < songs.length; i += BATCH_SIZE) batches.push({ songs: songs.slice(i, i + BATCH_SIZE) });

  const total = spotifyIds.length + songs.length;
  const result: BatchImportResult = { added: 0, unmatched: [], notSent: 0 };
  let done = 0;
  onProgress(0, total);

  for (const batch of batches) {
    const size = (batch.spotifyIds?.length ?? 0) + (batch.songs?.length ?? 0);
    const res = await playlistsApi
      .importSongs(playlistId, batch)
      .catch(() => new Promise((r) => setTimeout(r, 3000)).then(() => playlistsApi.importSongs(playlistId, batch)))
      .catch(() => null);
    if (!res?.data) {
      result.notSent = total - done;
      break;
    }
    result.added += res.data.added;
    result.unmatched.push(...res.data.unmatched);
    done += size;
    onProgress(done, total);
  }
  return result;
}

const MAX_WIDTH = 1080;
const SLICE_HEIGHT = 3000;
const SLICE_OVERLAP = 200; // more than one song row, so a row cut by a slice edge is whole in the next

/**
 * Shrinks a screenshot to phone width as JPEG (small uploads) and cuts long
 * scrolling screenshots into overlapping slices: browsers cap canvas size,
 * and the model reads small text better from shorter images.
 */
export async function screenshotToSlices(file: File): Promise<string[]> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const slices: string[] = [];
  for (let y = 0; ; y += SLICE_HEIGHT - SLICE_OVERLAP) {
    const sliceH = Math.min(SLICE_HEIGHT, h - y);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = sliceH;
    canvas.getContext('2d')!.drawImage(bmp, 0, y / scale, bmp.width, sliceH / scale, 0, 0, w, sliceH);
    slices.push(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    if (y + sliceH >= h) break;
  }
  bmp.close();
  return slices;
}

/** Screenshot slices per read: each read is one call against Gemini's per-minute quota. */
export const SLICES_PER_READ = 4;
/** Waits before each retry while the reader is busy; per-minute quotas reset within a minute. */
const BUSY_WAITS_S = [5, 15, 30, 60];

/**
 * Reads a few slices, waiting out a busy reader (503: Gemini's free-tier
 * quota) or a dropped connection. Never throws: a batch that still can't be
 * read (busy after every wait, unreadable, hourly import limit) comes back
 * as { error } so the caller can keep the songs it already has.
 */
export async function readSlicesPatiently(
  slices: string[],
  onWait: (seconds: number) => void
): Promise<{ songs: ImportSong[] } | { error: string }> {
  for (let attempt = 0; ; attempt++) {
    try {
      return { songs: (await playlistsApi.readScreenshots(slices)).data?.songs ?? [] };
    } catch (err) {
      const busy = !(err instanceof ApiError) || err.status === 503 || err.status === 504;
      if (!busy || attempt >= BUSY_WAITS_S.length) {
        return { error: err instanceof Error ? err.message : 'The screenshot reader is unavailable.' };
      }
      for (let s = BUSY_WAITS_S[attempt]; s > 0; s--) {
        onWait(s);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
}

/** Overlapping screenshots repeat songs; keep the first of each. */
export function dedupeSongs(songs: ImportSong[]): ImportSong[] {
  const key = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const seen = new Set<string>();
  return songs.filter((s) => {
    const k = `${key(s.title)}|${key(s.artist)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
