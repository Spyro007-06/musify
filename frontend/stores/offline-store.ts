import { create } from 'zustand';
import { Track } from '@/types/track';
import { musicApi } from '@/lib/api/music';
import { atBitrate } from '@/lib/audio/audio-engine';

/**
 * Songs saved in the app ("Save in Musify"), kept in the browser's Cache Storage:
 * the audio at /offline/<id> and { savedAt, track } at /offline/<id>.json.
 * JioSaavn's CDN allows cross-origin reads, so the file comes straight from
 * it, not through our backend. A saved song plays from here even when
 * online: no data used, no buffering on a weak connection.
 */
const CACHE = 'musify-offline-v1';
/** Half the size of 320 (about 5 MB a song) and still clear on phone speakers. */
const SAVE_KBPS = 160;

const audioKey = (id: string) => `/offline/${encodeURIComponent(id)}`;
const infoKey = (id: string) => `${audioKey(id)}.json`;
const hasStorage = () => typeof window !== 'undefined' && 'caches' in window;

// One playable URL per saved song for the session, reused on replays, so a
// song already queued switches without touching storage again.
// ponytail: never revoked — Chrome keeps these blobs on disk; revoke on
// track change if memory ever bites on iOS.
const objectUrls = new Map<string, string>();

interface OfflineState {
  /** Songs saved in the app. */
  ids: Set<string>;
  /** Songs being saved right now. */
  saving: Set<string>;
}

export const useOfflineStore = create<OfflineState>(() => ({ ids: new Set(), saving: new Set() }));

function updateSet(key: keyof OfflineState, change: (set: Set<string>) => void) {
  useOfflineStore.setState((s) => {
    const next = new Set(s[key]);
    change(next);
    return { [key]: next };
  });
}

/** Saved songs, newest first. */
export async function listOfflineTracks(): Promise<Track[]> {
  if (!hasStorage()) return [];
  const cache = await caches.open(CACHE);
  const keys = (await cache.keys()).filter((req) => req.url.endsWith('.json'));
  const saved = await Promise.all(
    keys.map((req) => cache.match(req).then((res) => res?.json() as Promise<{ savedAt: number; track: Track }> | undefined))
  );
  return saved
    .filter((s): s is { savedAt: number; track: Track } => Boolean(s?.track))
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((s) => s.track);
}

// Which songs are saved: read once at startup. Lookups wait for it, or a
// song played (or queued) right at startup would go to the network.
const loaded: Promise<void> = hasStorage()
  ? listOfflineTracks().then(
      (tracks) => useOfflineStore.setState({ ids: new Set(tracks.map((t) => t.id)) }),
      () => {}
    )
  : Promise.resolve();

export async function saveOffline(track: Track): Promise<void> {
  if (!hasStorage()) throw new Error("This browser can't save songs in the app. Try Save to this device.");
  updateSet('saving', (s) => s.add(track.id));
  try {
    // The prefetch variant: saving a song isn't a play in listening history.
    const res = await musicApi.prefetchStream(track.id);
    const url = res.data?.url || (res.data as unknown as { streamUrl?: string })?.streamUrl;
    if (!url) throw new Error('This song has no audio to save.');
    const audio = await fetch(atBitrate(url, SAVE_KBPS));
    if (!audio.ok) throw new Error(`The download failed (${audio.status}). Try again.`);

    const cache = await caches.open(CACHE);
    await cache.put(audioKey(track.id), audio); // streamed to disk, not held in memory
    // Details last: a song is listed only once its audio is in.
    await cache.put(
      infoKey(track.id),
      new Response(JSON.stringify({ savedAt: Date.now(), track }), { headers: { 'Content-Type': 'application/json' } })
    );
    // Asks the browser not to clear saved songs when the phone runs low on space.
    navigator.storage?.persist?.().catch(() => {});
    updateSet('ids', (s) => s.add(track.id));
  } finally {
    updateSet('saving', (s) => s.delete(track.id));
  }
}

export async function removeOffline(id: string): Promise<void> {
  const cache = await caches.open(CACHE);
  await cache.delete(infoKey(id));
  await cache.delete(audioKey(id));
  objectUrls.delete(id);
  updateSet('ids', (s) => s.delete(id));
}

/** A URL the player can load for a saved song; null if it isn't saved. */
export async function offlineAudioUrl(id: string): Promise<string | null> {
  const known = objectUrls.get(id);
  if (known) return known;
  await loaded;
  if (!hasStorage() || !useOfflineStore.getState().ids.has(id)) return null;
  const res = await (await caches.open(CACHE)).match(audioKey(id));
  if (!res) return null;
  const url = URL.createObjectURL(await res.blob());
  objectUrls.set(id, url);
  return url;
}
