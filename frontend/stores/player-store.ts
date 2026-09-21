import { create } from 'zustand';
import { Track } from '@/types/track';
import {
  AUTO_QUEUE_REFILL_THRESHOLD,
  DEFAULT_VOLUME,
  PREVIOUS_TRACK_THRESHOLD,
  SKIP_LOG_THRESHOLD,
} from '@/lib/player/player-constants';
import { shuffleArray } from '@/lib/player/player-utils';
import { getAudioEngine } from '@/lib/audio/audio-engine';
import { musicApi } from '@/lib/api/music';
import { userSignalsApi } from '@/lib/api/user-signals';

// Reports how a track was left (naturally finished vs. skipped away from) to
// the recommendation engine. Fire-and-forget: never let a logging failure
// affect playback, and don't log for guests (endpoints require auth).
function logOutgoingTrack(track: Track, currentTime: number, duration: number, completed: boolean) {
  if (typeof window === 'undefined') return;

  if (completed) {
    userSignalsApi
      .logPlayHistory({
        spotifyTrackId: track.id,
        albumId: track.album?.id,
        artistId: track.artists?.[0]?.id,
        genre: track.genre,
        sessionDuration: Math.round(currentTime),
        completedSong: true,
        listenPercentage: 100,
      })
      .catch(() => {
        // Best-effort signal; playback is unaffected by failures here.
      });
  } else if (currentTime > SKIP_LOG_THRESHOLD) {
    userSignalsApi
      .logSkip({
        trackId: track.id,
        skipTime: Math.round(currentTime),
        duration: Math.round(duration) || undefined,
      })
      .catch(() => {
        // Best-effort signal; playback is unaffected by failures here.
      });
  }
}

export type RepeatMode = 'off' | 'all' | 'one';

// Helpers to load persisted preferences safely in browser
function getSavedVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  try {
    const val = localStorage.getItem('musify_volume');
    return val !== null ? Math.max(0, Math.min(1, parseFloat(val))) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function getSavedMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('musify_muted') === 'true';
  } catch {
    return false;
  }
}

function getSavedShuffle(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('musify_shuffle') === 'true';
  } catch {
    return false;
  }
}

function getSavedRepeat(): RepeatMode {
  if (typeof window === 'undefined') return 'off';
  try {
    const val = localStorage.getItem('musify_repeat') as RepeatMode;
    return val === 'all' || val === 'one' ? val : 'off';
  } catch {
    return 'off';
  }
}

// Module-level playback generation counter to prevent race conditions
let activePlaybackGeneration = 0;

// The queue is meant to feel endless, like radio: once only a few tracks
// remain after the current one, quietly fetch more of the same personalized
// feed and append them, instead of waiting for the queue to actually run
// dry. This flag just prevents two overlapping top-up fetches.
let isToppingUpQueue = false;

// Warms the upcoming queue track's stream URL while the current one is
// still playing, so skipping to it doesn't wait on a fresh network round
// trip. Single-use and short-lived — these are signed CDN URLs, not meant
// to be replayed long after being issued.
const STREAM_URL_CACHE_TTL_MS = 4 * 60 * 1000;
const streamUrlCache = new Map<string, { url: string; cachedAt: number }>();

function takeCachedStreamUrl(trackId: string): string | null {
  const entry = streamUrlCache.get(trackId);
  if (!entry) return null;
  streamUrlCache.delete(trackId);
  if (Date.now() - entry.cachedAt > STREAM_URL_CACHE_TTL_MS) return null;
  return entry.url;
}

// Auto-continues playback once the queue runs out, using the same
// personalized feed as Home's "Made For You" — reuse, not a new engine.
async function fetchAutoQueueTracks(existingQueue: Track[]): Promise<Track[]> {
  try {
    const res = await musicApi.getRecommended();
    const existingIds = new Set(existingQueue.map((t) => t.id));
    return (res.data?.tracks || []).filter((t) => !existingIds.has(t.id));
  } catch {
    return [];
  }
}

function prefetchTrackStream(track: Track) {
  if (streamUrlCache.has(track.id)) return;
  musicApi
    .prefetchStream(track.id)
    .then((res) => {
      const url = res.data?.url || (res.data as unknown as { streamUrl?: string })?.streamUrl;
      if (url) streamUrlCache.set(track.id, { url, cachedAt: Date.now() });
    })
    .catch(() => {
      // Best-effort — playTrack just falls back to a normal fetch if this never lands.
    });
}

export interface PlayerState {
  currentTrack: Track | null;
  streamUrl: string | null;
  queue: Track[];
  originalQueue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;
  isExpanded: boolean;
  isQueueOpen: boolean;

  // Actions
  playTrack: (track: Track, contextQueue?: Track[], transitionReason?: 'skip' | 'completed') => Promise<void>;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  nextTrack: (reason?: 'manual' | 'ended') => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setQueue: (queue: Track[], startIndex?: number) => void;
  maybeTopUpQueue: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  openExpanded: () => void;
  closeExpanded: () => void;
  toggleQueue: () => void;
  setQueueOpen: (open: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  streamUrl: null,
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  volume: getSavedVolume(),
  isMuted: getSavedMuted(),
  shuffle: getSavedShuffle(),
  repeat: getSavedRepeat(),
  error: null,
  isExpanded: false,
  isQueueOpen: false,

  playTrack: async (track: Track, contextQueue?: Track[], transitionReason = 'skip') => {
    // 1. Race-condition protection: increment generation counter
    const requestGen = ++activePlaybackGeneration;

    const { shuffle, originalQueue, queue, currentTrack, currentTime, duration } = get();
    const engine = getAudioEngine();

    // Report how the outgoing track was left before switching to the new one.
    if (currentTrack && currentTrack.id !== track.id) {
      logOutgoingTrack(currentTrack, currentTime, duration, transitionReason === 'completed');
    }

    // 2. Determine queue context
    let nextOriginalQueue = originalQueue;
    let nextQueue = queue;
    let nextIndex = 0;

    if (contextQueue && contextQueue.length > 0) {
      nextOriginalQueue = contextQueue;
      if (shuffle) {
        const others = contextQueue.filter((t) => t.id !== track.id);
        nextQueue = [track, ...shuffleArray(others)];
        nextIndex = 0;
      } else {
        nextQueue = contextQueue;
        const found = contextQueue.findIndex((t) => t.id === track.id);
        nextIndex = found !== -1 ? found : 0;
      }
    } else {
      // Check if track is already in queue
      const foundInQueue = nextQueue.findIndex((t) => t.id === track.id);
      if (foundInQueue !== -1) {
        nextIndex = foundInQueue;
      } else {
        nextQueue = [track, ...nextQueue];
        nextOriginalQueue = [track, ...nextOriginalQueue];
        nextIndex = 0;
      }
    }

    // Set optimistic player state: track selected, loading begins, error cleared
    set({
      currentTrack: track,
      currentIndex: nextIndex,
      queue: nextQueue,
      originalQueue: nextOriginalQueue,
      isLoading: true,
      error: null,
      currentTime: 0,
      duration: track.duration || track.durationSeconds || (track.durationMs ? track.durationMs / 1000 : 0),
    });

    try {
      // 3. Request playable stream URL only now (user initiated playback) —
      // unless we already warmed it while the previous track was playing.
      const cachedUrl = takeCachedStreamUrl(track.id);
      let streamUrl = cachedUrl ?? undefined;

      if (!streamUrl) {
        const res = await musicApi.getStream(track.id);

        // Check if request is still active
        if (requestGen !== activePlaybackGeneration) {
          return; // Stale request, discard
        }

        streamUrl = res.data?.url || (res.data as unknown as { streamUrl?: string })?.streamUrl;
      }

      if (!streamUrl) {
        throw new Error('Playback stream URL unavailable for this track.');
      }

      // 4. Load audio into authoritative engine
      engine.load(streamUrl);
      engine.setVolume(get().isMuted ? 0 : get().volume);
      engine.setMuted(get().isMuted);

      const played = await engine.play();

      if (requestGen !== activePlaybackGeneration) {
        return;
      }

      set({
        streamUrl,
        isLoading: false,
        isPlaying: played,
        error: null,
      });

      // 5. Warm the next queue track's stream URL now, while this one plays.
      const { queue: liveQueue, currentIndex: liveIndex, repeat: liveRepeat } = get();
      const upcoming = liveQueue[liveIndex + 1] ?? (liveRepeat === 'all' ? liveQueue[0] : undefined);
      if (upcoming) prefetchTrackStream(upcoming);

      get().maybeTopUpQueue();
    } catch (err: unknown) {
      if (requestGen !== activePlaybackGeneration) return;

      const errorMessage =
        err instanceof Error ? err.message : 'Unable to stream this track at this time.';

      set({
        isLoading: false,
        isPlaying: false,
        error: errorMessage,
      });
    }
  },

  pause: () => {
    getAudioEngine().pause();
    set({ isPlaying: false });
  },

  resume: () => {
    const { streamUrl, currentTrack } = get();
    if (streamUrl) {
      getAudioEngine().play();
      set({ isPlaying: true });
    } else if (currentTrack) {
      get().playTrack(currentTrack);
    }
  },

  togglePlay: () => {
    const { isPlaying, pause, resume } = get();
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  },

  nextTrack: async (reason = 'manual') => {
    const { queue, currentIndex, repeat, playTrack, currentTrack, currentTime, duration } = get();
    if (queue.length === 0) return;

    if (repeat === 'one' && currentTrack) {
      // Replay current track: reset to 0. A natural "ended" here is still a
      // completed listen even though the track itself doesn't change.
      if (reason === 'ended') {
        logOutgoingTrack(currentTrack, currentTime, duration, true);
      }
      const engine = getAudioEngine();
      engine.seek(0);
      engine.play();
      set({ currentTime: 0, isPlaying: true });
      return;
    }

    const nextIndex = currentIndex + 1;
    const transitionReason = reason === 'ended' ? 'completed' : 'skip';
    if (nextIndex < queue.length) {
      await playTrack(queue[nextIndex], undefined, transitionReason);
    } else if (repeat === 'all' && queue.length > 0) {
      await playTrack(queue[0], undefined, transitionReason);
    } else {
      // End of queue reached and repeat is off — log the outgoing track,
      // then keep the music going with a personalized batch instead of
      // just stopping. In practice maybeTopUpQueue (called after every
      // track starts) should have already refilled the queue well before
      // it got this far — this is the fallback for a fetch that failed or
      // hadn't landed yet.
      if (currentTrack) {
        logOutgoingTrack(currentTrack, currentTime, duration, reason === 'ended');
      }
      const more = await fetchAutoQueueTracks(queue);
      if (more.length > 0) {
        set((s) => ({ queue: [...s.queue, ...more], originalQueue: [...s.originalQueue, ...more] }));
        await get().nextTrack(reason);
        return;
      }
      getAudioEngine().pause();
      set({ isPlaying: false, currentTime: 0 });
    }
  },

  previousTrack: async () => {
    const { queue, currentIndex, currentTime, playTrack } = get();
    if (queue.length === 0) return;

    // If meaningfully progressed past threshold, restart current track
    if (currentTime > PREVIOUS_TRACK_THRESHOLD) {
      getAudioEngine().seek(0);
      set({ currentTime: 0 });
      return;
    }

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      await playTrack(queue[prevIndex]);
    } else {
      getAudioEngine().seek(0);
      set({ currentTime: 0 });
    }
  },

  seek: (seconds: number) => {
    getAudioEngine().seek(seconds);
    set({ currentTime: seconds });
  },

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    getAudioEngine().setVolume(clamped);
    set({ volume: clamped, isMuted: clamped === 0 });
    try {
      localStorage.setItem('musify_volume', String(clamped));
    } catch {
      // Ignore localStorage errors
    }
  },

  toggleMute: () => {
    const { isMuted, volume } = get();
    const nextMuted = !isMuted;
    const engine = getAudioEngine();
    engine.setMuted(nextMuted);
    engine.setVolume(nextMuted ? 0 : volume);
    set({ isMuted: nextMuted });
    try {
      localStorage.setItem('musify_muted', String(nextMuted));
    } catch {
      // Ignore localStorage errors
    }
  },

  toggleShuffle: () => {
    const { shuffle, queue, currentTrack, originalQueue } = get();
    const nextShuffle = !shuffle;

    if (nextShuffle) {
      const remaining = originalQueue.filter((t) => t.id !== currentTrack?.id);
      const shuffled = shuffleArray(remaining);
      const newQueue = currentTrack ? [currentTrack, ...shuffled] : shuffled;
      set({ shuffle: true, queue: newQueue, currentIndex: 0 });
    } else {
      const index = originalQueue.findIndex((t) => t.id === currentTrack?.id);
      set({
        shuffle: false,
        queue: originalQueue,
        currentIndex: index !== -1 ? index : 0,
      });
    }

    try {
      localStorage.setItem('musify_shuffle', String(nextShuffle));
    } catch {
      // Ignore
    }
  },

  cycleRepeat: () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const { repeat } = get();
    const nextRepeat = modes[(modes.indexOf(repeat) + 1) % modes.length];
    set({ repeat: nextRepeat });
    try {
      localStorage.setItem('musify_repeat', nextRepeat);
    } catch {
      // Ignore
    }
  },

  setQueue: (newQueue: Track[], startIndex = 0) => {
    const track = newQueue[startIndex] || null;
    set({
      queue: newQueue,
      originalQueue: newQueue,
      currentTrack: track,
      currentIndex: startIndex,
      currentTime: 0,
    });
  },

  maybeTopUpQueue: () => {
    if (isToppingUpQueue) return;
    const { queue, currentIndex, repeat } = get();
    if (repeat === 'one') return; // stuck replaying one track — nothing to top up
    const remaining = queue.length - currentIndex - 1;
    if (remaining >= AUTO_QUEUE_REFILL_THRESHOLD) return;

    isToppingUpQueue = true;
    fetchAutoQueueTracks(queue)
      .then((more) => {
        if (more.length > 0) {
          set((s) => ({ queue: [...s.queue, ...more], originalQueue: [...s.originalQueue, ...more] }));
        }
      })
      .finally(() => {
        isToppingUpQueue = false;
      });
  },

  addToQueue: (track: Track) => {
    set((state) => ({
      queue: [...state.queue, track],
      originalQueue: [...state.originalQueue, track],
    }));
  },

  removeFromQueue: (trackId: string) => {
    set((state) => {
      const filtered = state.queue.filter((t) => t.id !== trackId);
      const origFiltered = state.originalQueue.filter((t) => t.id !== trackId);
      const currentIdx = filtered.findIndex((t) => t.id === state.currentTrack?.id);
      return {
        queue: filtered,
        originalQueue: origFiltered,
        currentIndex: currentIdx !== -1 ? currentIdx : 0,
      };
    });
  },

  clearQueue: () => {
    const { currentTrack } = get();
    set({
      queue: currentTrack ? [currentTrack] : [],
      originalQueue: currentTrack ? [currentTrack] : [],
      currentIndex: currentTrack ? 0 : -1,
    });
  },

  openExpanded: () => set({ isExpanded: true }),
  closeExpanded: () => set({ isExpanded: false }),

  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  setQueueOpen: (open: boolean) => set({ isQueueOpen: open }),

  setCurrentTime: (time: number) => set({ currentTime: time }),
  setDuration: (duration: number) => set({ duration }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setError: (error: string | null) => set({ error }),
}));
