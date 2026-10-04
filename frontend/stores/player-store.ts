import { create } from 'zustand';
import { Track } from '@/types/track';
import {
  AUTO_QUEUE_REFILL_THRESHOLD,
  AUTO_QUEUE_RETRY_MS,
  DEFAULT_VOLUME,
  MAX_SKIPPED_FAILURES,
  MAX_CROSSFADE_SECONDS,
  PRELOAD_NEXT_SECONDS,
  PREVIOUS_TRACK_THRESHOLD,
  SKIP_LOG_THRESHOLD,
} from '@/lib/player/player-constants';
import { shuffleArray } from '@/lib/player/player-utils';
import { getAudioEngine } from '@/lib/audio/audio-engine';
import { musicApi } from '@/lib/api/music';
import { userSignalsApi } from '@/lib/api/user-signals';
import { useAuthStore } from '@/stores/auth-store';

// Reports how a track was left (naturally finished vs. skipped away from) to
// the recommendation engine. Fire-and-forget: never let a logging failure
// affect playback, and don't log for guests (endpoints require auth).
function logOutgoingTrack(track: Track, currentTime: number, duration: number, completed: boolean) {
  // A guest's 401 here would bounce them to /login mid-song (apiClient's refresh-failed redirect).
  if (typeof window === 'undefined' || !useAuthStore.getState().isAuthenticated) return;

  if (completed) {
    userSignalsApi
      .logPlayHistory({
        trackId: track.id,
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

function getSavedCrossfade(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = Number(localStorage.getItem('musify_crossfade'));
    return Number.isFinite(val) ? Math.max(0, Math.min(MAX_CROSSFADE_SECONDS, Math.round(val))) : 0;
  } catch {
    return 0;
  }
}

// What was playing, so a reload (or Android closing the app in the
// background) comes back to the same song, queue and position, paused.
const SESSION_KEY = 'musify_session';
const SESSION_FIELDS = [
  'currentTrack', 'queue', 'originalQueue', 'currentIndex', 'userQueue',
  'queueSource', 'recommendedIds', 'currentTime', 'duration',
] as const;
// Where the restored song was; applied once its stream loads on Play.
let resumeAt = 0;
let sessionSavedAt = -1;

function getSavedSession(): Partial<PlayerState> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!saved?.currentTrack?.id || !Array.isArray(saved.queue)) return {};
    resumeAt = Number(saved.currentTime) || 0;
    return { ...saved, originalQueue: saved.originalQueue ?? saved.queue, isPlaying: false, streamUrl: null };
  } catch {
    return {};
  }
}

// Saved when the song or queue changes, and every 5s of playback.
function saveSession(state: PlayerState, prev: PlayerState) {
  const changed = SESSION_FIELDS.some((k) => k !== 'currentTime' && k !== 'duration' && state[k] !== prev[k]);
  if (!changed && Math.abs(state.currentTime - sessionSavedAt) < 5) return;
  sessionSavedAt = state.currentTime;
  try {
    if (!state.currentTrack) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(Object.fromEntries(SESSION_FIELDS.map((k) => [k, state[k]]))));
  } catch {
    // Full or blocked storage: the session just won't survive a reload.
  }
}

// Module-level playback generation counter to prevent race conditions
let activePlaybackGeneration = 0;

// Tracks that wouldn't play in a row, reset by the next one that does. A
// song that won't play is skipped like radio would, but past a few in a row
// nothing is going to play (offline?) and skipping on would just spin.
let consecutiveFailures = 0;

// The queue is meant to feel endless, like radio: once only a few tracks
// remain after the current one, quietly fetch more of the same personalized
// feed and append them, instead of waiting for the queue to actually run
// dry. This flag just prevents two overlapping top-up fetches.
let isToppingUpQueue = false;
// After a top-up that came back empty (offline, upstream down), when to try again.
let topUpRetryAt = 0;

// Every track played this session, so the auto-refill (below) never re-adds
// something the user already listened to — a radio station shouldn't repeat
// a song it just played. Deliberately session-only (resets on reload): this
// is about not re-suggesting within one continuous listening session, not a
// permanent "never play again" list.
const playedTrackIds = new Set<string>();

function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Sleep timer: a wall-clock deadline, checked on every playback time update
// (those keep firing with the screen off, unlike throttled background
// timers) plus a plain timeout as the backstop for when playback is paused.
let sleepTimeout: ReturnType<typeof setTimeout> | null = null;

// Warms the upcoming queue track's stream URL while the current one is
// still playing, so switching to it doesn't wait on a network round trip.
// Single-use, but no expiry: the backend returns plain JioSaavn CDN paths
// (jiosaavn-sdk decrypts them; no signature), not time-limited links. The
// old 4-minute TTL just made every longer song fall back to a live fetch
// at the track change. If the backend ever serves signed URLs, add a TTL back.
const streamUrlCache = new Map<string, string>();

function takeCachedStreamUrl(trackId: string): string | null {
  const url = streamUrlCache.get(trackId) ?? null;
  streamUrlCache.delete(trackId);
  return url;
}

// This session's plays in order, newest last — the seeds for autoplay.
const playOrder: string[] = [];

// Keeps the queue going once what you picked runs out (Spotify's autoplay).
// The backend seeds JioSaavn's song radio from the latest plays, so each
// refill follows what you're listening to and keeps finding new songs, and
// it drops anything in your listening history or skip list. This session's
// plays and everything already queued are sent along (guests have only that).
async function fetchAutoQueueTracks(alreadyQueued: Track[]): Promise<Track[]> {
  const seeds = playOrder.slice(-3).reverse();
  if (seeds.length === 0) return [];
  const have = new Set([...playedTrackIds, ...alreadyQueued.map((t) => t.id)]);
  try {
    // ponytail: newest 400 ids keeps the URL short; the server already
    // excludes the signed-in user's full history, so older ones aren't lost.
    const res = await musicApi.getAutoplay(seeds, [...have].slice(-400));
    return (res.data || []).filter((t) => !have.has(t.id));
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
      if (url) streamUrlCache.set(track.id, url);
    })
    .catch(() => {
      // Best-effort — playTrack just falls back to a normal fetch if this never lands.
    });
}

/** A row in the queue screen: "queued" = userQueue[index], "next" = queue[currentIndex + 1 + index]. */
export interface QueueRef {
  section: 'queued' | 'next';
  index: number;
}

export type SleepTimerOption = number | 'end-of-track' | null;

export interface PlayerState {
  currentTrack: Track | null;
  streamUrl: string | null;
  /**
   * The context being played (an album, playlist, search results...) plus the
   * auto-added recommendations after it. queue[currentIndex] is the context
   * song playing now — or the one before, while a queued song plays.
   */
  queue: Track[];
  originalQueue: Track[];
  currentIndex: number;
  /**
   * Songs added with "Add to queue" (Spotify's "Queued"). Played before the
   * context continues, in the order added; shuffle and Clear only touch this
   * list the way Spotify does (shuffle never, Clear only this).
   */
  userQueue: Track[];
  /** What the context is, for "Playing …" / "Next from: …". Null = unnamed. */
  queueSource: string | null;
  /** Ids of auto-added recommendations in the queue, shown as "Next up: Recommended tracks". */
  recommendedIds: string[];
  sleepEndsAt: number | null;
  sleepAtTrackEnd: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Seconds the end of a song overlaps the next one; 0 = off. */
  crossfadeSeconds: number;
  error: string | null;
  isExpanded: boolean;
  isQueueOpen: boolean;

  // Actions
  /**
   * opts.atIndex: which context slot this is, when the caller knows (the same
   * song can appear twice). opts.fromUserQueue: play it without moving the
   * context position.
   */
  playTrack: (
    track: Track,
    contextQueue?: Track[],
    transitionReason?: 'skip' | 'completed',
    opts?: { atIndex?: number; fromUserQueue?: boolean }
  ) => Promise<void>;
  /** playTrack with a name for the context, shown as "Playing …" / "Next from: …". */
  playFrom: (source: string, track: Track, tracks: Track[]) => Promise<void>;
  /** Tap on a row in the queue screen. */
  playFromQueue: (ref: QueueRef) => Promise<void>;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  nextTrack: (reason?: 'manual' | 'ended') => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  /** Shuffle the upcoming context again (shown while shuffle is on). */
  reshuffle: () => void;
  cycleRepeat: () => void;
  setCrossfade: (seconds: number) => void;
  setQueue: (queue: Track[], startIndex?: number) => void;
  maybeTopUpQueue: () => void;
  /** Appends to the Queued list; plays it right away if nothing is loaded yet. */
  addToQueue: (track: Track) => 'queued' | 'playing';
  removeFromQueue: (refs: QueueRef[]) => void;
  /** Drag-reorder within one section. */
  moveInQueue: (section: QueueRef['section'], from: number, to: number) => void;
  /** Edit mode's "Move up": the selected songs go to the top of Queued, in on-screen order. */
  moveToTopOfQueue: (refs: QueueRef[]) => void;
  /** Like Spotify's Clear: empties only the Queued list. */
  clearQueue: () => void;
  setSleepTimer: (option: SleepTimerOption) => void;
  openExpanded: () => void;
  closeExpanded: () => void;
  toggleQueue: () => void;
  setQueueOpen: (open: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setError: (error: string | null) => void;
  hydratePreferences: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  streamUrl: null,
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  userQueue: [],
  queueSource: null,
  recommendedIds: [],
  sleepEndsAt: null,
  sleepAtTrackEnd: false,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  // Always start from these fixed defaults, even in the browser — the
  // server has no localStorage, so seeding from it here would make the
  // client's first render diverge from the SSR HTML and fail hydration.
  // The real saved values are applied after mount via hydratePreferences().
  volume: DEFAULT_VOLUME,
  isMuted: false,
  shuffle: false,
  repeat: 'off',
  crossfadeSeconds: 0,
  error: null,
  isExpanded: false,
  isQueueOpen: false,

  playTrack: async (track: Track, contextQueue?: Track[], transitionReason = 'skip', opts = {}) => {
    // 1. Race-condition protection: increment generation counter
    const requestGen = ++activePlaybackGeneration;

    playedTrackIds.add(track.id);
    if (playOrder[playOrder.length - 1] !== track.id) playOrder.push(track.id);

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

    if (opts.fromUserQueue) {
      // A queued song plays "outside" the context: keep its position so the
      // context resumes right after once the queued songs are done.
    } else if (contextQueue && contextQueue.length > 0) {
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
      const foundInQueue =
        opts.atIndex !== undefined && nextQueue[opts.atIndex]?.id === track.id
          ? opts.atIndex
          : nextQueue.findIndex((t) => t.id === track.id);
      if (foundInQueue !== -1) {
        nextIndex = foundInQueue;
      } else {
        nextQueue = [track, ...nextQueue];
        nextOriginalQueue = [track, ...nextOriginalQueue];
        nextIndex = 0;
      }
    }

    // Set optimistic player state: track selected, loading begins, error cleared
    const isNewContext = !opts.fromUserQueue && Boolean(contextQueue && contextQueue.length > 0);
    set({
      currentTrack: track,
      ...(opts.fromUserQueue ? {} : { currentIndex: nextIndex, queue: nextQueue, originalQueue: nextOriginalQueue }),
      // A new context starts unnamed (playFrom names it) with no recommendations yet.
      ...(isNewContext ? { queueSource: null, recommendedIds: [] } : {}),
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
      if (!played && engine.hasError()) {
        throw new Error("This track can't be played right now.");
      }
      if (played) consecutiveFailures = 0;

      set({
        streamUrl,
        isLoading: false,
        isPlaying: played,
        error: null,
      });
      // Queue top-up and warming the next stream URL are both handled by the
      // subscription at the bottom of this file.
    } catch (err: unknown) {
      if (requestGen !== activePlaybackGeneration) return;

      const errorMessage =
        err instanceof Error ? err.message : 'Unable to stream this track at this time.';

      set({
        isLoading: false,
        isPlaying: false,
        error: errorMessage,
      });

      // Repeat-one would just retry this same broken track.
      if (get().repeat !== 'one' && ++consecutiveFailures <= MAX_SKIPPED_FAILURES) {
        get().nextTrack();
      }
    }
  },

  playFrom: (source: string, track: Track, tracks: Track[]) => {
    // playTrack sets its state synchronously before its first await, so the
    // name lands on the new context (not the old one) and before any re-render.
    const started = get().playTrack(track, tracks);
    set({ queueSource: source });
    return started;
  },

  playFromQueue: ({ section, index }: QueueRef) => {
    const { userQueue, currentIndex } = get();
    if (section === 'queued') {
      const track = userQueue[index];
      if (!track) return Promise.resolve();
      set({ userQueue: userQueue.filter((_, i) => i !== index) });
      return get().playTrack(track, undefined, 'skip', { fromUserQueue: true });
    }
    const at = currentIndex + 1 + index;
    const track = get().queue[at];
    return track ? get().playTrack(track, undefined, 'skip', { atIndex: at }) : Promise.resolve();
  },

  pause: () => {
    getAudioEngine().pause();
    set({ isPlaying: false });
  },

  resume: () => {
    const { streamUrl, currentTrack } = get();
    if (streamUrl) {
      set({ isPlaying: true });
      // A background play() can be refused; don't stay stuck on "playing".
      getAudioEngine().play().then((played) => {
        if (!played) set({ isPlaying: false });
      });
    } else if (currentTrack) {
      // A restored session: load the song and jump back to where it was.
      const at = resumeAt;
      resumeAt = 0;
      get()
        .playTrack(currentTrack, undefined, 'skip', { atIndex: get().currentIndex })
        .then(() => {
          if (at > 0 && get().currentTrack?.id === currentTrack.id) get().seek(at);
        });
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
    const { queue, currentIndex, repeat, playTrack, currentTrack, currentTime, duration, userQueue } = get();

    // Sleep timer set to "End of track": stop here instead of moving on.
    if (reason === 'ended' && get().sleepAtTrackEnd) {
      set({ sleepAtTrackEnd: false, isPlaying: false });
      return;
    }
    if (queue.length === 0 && userQueue.length === 0) return;

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
    if (userQueue.length > 0) {
      // Queued songs always go first, in the order they were added.
      const [queued, ...rest] = userQueue;
      set({ userQueue: rest });
      await playTrack(queued, undefined, transitionReason, { fromUserQueue: true });
    } else if (nextIndex < queue.length) {
      await playTrack(queue[nextIndex], undefined, transitionReason, { atIndex: nextIndex });
    } else {
      if (repeat !== 'all') {
        // End of the queue. maybeTopUpQueue (run whenever the queue runs low)
        // has normally refilled it by now; this catches a refill that failed
        // or hadn't landed yet.
        const gen = activePlaybackGeneration;
        const more = await fetchAutoQueueTracks([...queue, ...userQueue]);
        if (gen !== activePlaybackGeneration) return; // the user picked something meanwhile
        if (more.length > 0) {
          appendRecommended(more);
          await get().nextTrack(reason);
          return;
        }
        // Nothing new to be had (offline, or the catalog came back empty):
        // start the queue over rather than go silent.
      }
      await playTrack(queue[0], undefined, transitionReason, { atIndex: 0 });
    }
  },

  previousTrack: async () => {
    const { queue, currentIndex, currentTime, playTrack, currentTrack } = get();
    if (queue.length === 0) return;

    // If meaningfully progressed past threshold, restart current track
    if (currentTime > PREVIOUS_TRACK_THRESHOLD) {
      getAudioEngine().seek(0);
      set({ currentTime: 0 });
      return;
    }

    // While a queued song plays, the context is still parked on the song
    // before it — so "previous" means that one, not the one before it.
    const onContext = queue[currentIndex]?.id === currentTrack?.id;
    const prevIndex = onContext ? currentIndex - 1 : currentIndex;
    if (prevIndex >= 0) {
      await playTrack(queue[prevIndex], undefined, 'skip', { atIndex: prevIndex });
    } else {
      getAudioEngine().seek(0);
      set({ currentTime: 0 });
    }
  },

  seek: (seconds: number) => {
    if (!get().streamUrl) resumeAt = seconds; // restored, not loaded yet: start there on Play
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
    const { shuffle, queue, currentIndex, currentTrack, originalQueue } = get();
    const nextShuffle = !shuffle;
    // Shuffle only reorders the context; the Queued list is never touched.
    // Anchor on the context's current song (a queued song may be playing).
    const anchor = queue[currentIndex] ?? currentTrack;

    if (nextShuffle) {
      const remaining = originalQueue.filter((t) => t.id !== anchor?.id);
      const shuffled = shuffleArray(remaining);
      const newQueue = anchor ? [anchor, ...shuffled] : shuffled;
      set({ shuffle: true, queue: newQueue, currentIndex: 0 });
    } else {
      const index = originalQueue.findIndex((t) => t.id === anchor?.id);
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

  reshuffle: () => {
    const { shuffle, queue, currentIndex } = get();
    if (!shuffle) return;
    set({ queue: [...queue.slice(0, currentIndex + 1), ...shuffleArray(queue.slice(currentIndex + 1))] });
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

  setCrossfade: (seconds: number) => {
    const clamped = Math.max(0, Math.min(MAX_CROSSFADE_SECONDS, Math.round(seconds)));
    set({ crossfadeSeconds: clamped });
    try {
      localStorage.setItem('musify_crossfade', String(clamped));
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
    if (isToppingUpQueue || Date.now() < topUpRetryAt) return;
    const { queue, currentIndex, repeat, userQueue } = get();
    if (repeat === 'one') return; // stuck replaying one track — nothing to top up
    const remaining = queue.length - currentIndex - 1;
    if (remaining >= AUTO_QUEUE_REFILL_THRESHOLD) return;

    isToppingUpQueue = true;
    fetchAutoQueueTracks([...queue, ...userQueue])
      .then((more) => {
        appendRecommended(more);
        topUpRetryAt = more.length > 0 ? 0 : Date.now() + AUTO_QUEUE_RETRY_MS;
      })
      .finally(() => {
        isToppingUpQueue = false;
      });
  },

  addToQueue: (track: Track) => {
    if (!get().currentTrack) {
      get().playTrack(track, [track]);
      return 'playing';
    }
    set((s) => ({ userQueue: [...s.userQueue, track] }));
    return 'queued';
  },

  removeFromQueue: (refs: QueueRef[]) =>
    set((s) => {
      const queued = new Set(refs.filter((r) => r.section === 'queued').map((r) => r.index));
      const next = new Set(refs.filter((r) => r.section === 'next').map((r) => s.currentIndex + 1 + r.index));
      return { userQueue: s.userQueue.filter((_, i) => !queued.has(i)), ...withoutContextIndices(s, next) };
    }),

  moveInQueue: (section, from, to) =>
    set((s) => {
      if (from === to) return {};
      if (section === 'queued') return { userQueue: moveItem(s.userQueue, from, to) };
      const base = s.currentIndex + 1;
      const queue = moveItem(s.queue, base + from, base + to);
      return s.shuffle ? { queue } : { queue, originalQueue: queue };
    }),

  moveToTopOfQueue: (refs: QueueRef[]) =>
    set((s) => {
      const queuedIdx = refs.filter((r) => r.section === 'queued').map((r) => r.index).sort((a, b) => a - b);
      const nextAbs = refs.filter((r) => r.section === 'next').map((r) => s.currentIndex + 1 + r.index).sort((a, b) => a - b);
      const moving = [...queuedIdx.map((i) => s.userQueue[i]), ...nextAbs.map((i) => s.queue[i])];
      const staying = s.userQueue.filter((_, i) => !queuedIdx.includes(i));
      return { userQueue: [...moving, ...staying], ...withoutContextIndices(s, new Set(nextAbs)) };
    }),

  clearQueue: () => set({ userQueue: [] }),

  setSleepTimer: (option: SleepTimerOption) => {
    if (sleepTimeout) clearTimeout(sleepTimeout);
    sleepTimeout = null;
    const endsAt = typeof option === 'number' ? Date.now() + option * 60_000 : null;
    if (endsAt) sleepTimeout = setTimeout(expireSleepTimer, endsAt - Date.now());
    set({ sleepEndsAt: endsAt, sleepAtTrackEnd: option === 'end-of-track' });
  },

  openExpanded: () => set({ isExpanded: true }),
  closeExpanded: () => set({ isExpanded: false }),

  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  setQueueOpen: (open: boolean) => set({ isQueueOpen: open }),

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
    const { sleepEndsAt } = get();
    if (sleepEndsAt && Date.now() >= sleepEndsAt) expireSleepTimer();
    prepareNextTrack(get(), time);
  },
  setDuration: (duration: number) => set({ duration }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setError: (error: string | null) => set({ error }),

  hydratePreferences: () => {
    set({
      volume: getSavedVolume(),
      isMuted: getSavedMuted(),
      shuffle: getSavedShuffle(),
      repeat: getSavedRepeat(),
      crossfadeSeconds: getSavedCrossfade(),
      ...(get().currentTrack ? {} : getSavedSession()),
    });
  },
}));

/**
 * Drops the given absolute queue positions (all after currentIndex) from the
 * context. With shuffle off originalQueue mirrors queue; with it on, one
 * matching copy is dropped from the unshuffled order too.
 */
function withoutContextIndices(s: PlayerState, positions: Set<number>): Pick<PlayerState, 'queue' | 'originalQueue'> {
  if (positions.size === 0) return { queue: s.queue, originalQueue: s.originalQueue };
  const queue = s.queue.filter((_, i) => !positions.has(i));
  if (!s.shuffle) return { queue, originalQueue: queue };
  const originalQueue = [...s.originalQueue];
  for (const i of positions) {
    const at = originalQueue.findIndex((t) => t.id === s.queue[i].id);
    if (at !== -1) originalQueue.splice(at, 1);
  }
  return { queue, originalQueue };
}

// Adds autoplay picks after the context, minus any already there: the
// background top-up and the end-of-queue fetch can land at the same time.
function appendRecommended(more: Track[]) {
  usePlayerStore.setState((s) => {
    const have = new Set(s.queue.map((t) => t.id));
    const fresh = more.filter((t) => !have.has(t.id));
    return {
      queue: [...s.queue, ...fresh],
      originalQueue: [...s.originalQueue, ...fresh],
      recommendedIds: [...s.recommendedIds, ...fresh.map((t) => t.id)],
    };
  });
}

function expireSleepTimer() {
  if (sleepTimeout) clearTimeout(sleepTimeout);
  sleepTimeout = null;
  usePlayerStore.getState().pause();
  usePlayerStore.setState({ sleepEndsAt: null });
}

function upcomingTrack({ queue, currentIndex, repeat, userQueue }: PlayerState): Track | undefined {
  return userQueue[0] ?? queue[currentIndex + 1] ?? (repeat === 'all' ? queue[0] : undefined);
}

// The playback generation already crossfaded out of, so it happens once per song.
let crossfadedGeneration = -1;

/**
 * Near the end of a song: buffer the next one on the engine's standby
 * element (so the switch is gapless), and with crossfade on, start it early
 * and fade between the two. Only once the next stream URL is already warm,
 * so the switch happens synchronously, with no network wait mid-fade.
 */
function prepareNextTrack(state: PlayerState, time: number) {
  const { currentTrack, isPlaying, duration, repeat, sleepAtTrackEnd, crossfadeSeconds } = state;
  if (!currentTrack || !isPlaying || !duration || repeat === 'one') return;
  const next = upcomingTrack(state);
  const url = next && streamUrlCache.get(next.id);
  if (!url) return;

  const remaining = duration - time;
  const engine = getAudioEngine();
  if (remaining <= Math.max(PRELOAD_NEXT_SECONDS, crossfadeSeconds + 5)) engine.preload(url);

  const fade =
    crossfadeSeconds > 0 &&
    !sleepAtTrackEnd && // "end of track" must stop at the real end
    duration > crossfadeSeconds * 3 && // don't fade away most of a short clip
    remaining <= crossfadeSeconds &&
    crossfadedGeneration !== activePlaybackGeneration;
  if (!fade) return;

  crossfadedGeneration = activePlaybackGeneration;
  engine.armCrossfade(crossfadeSeconds);
  // Counts as a completed listen; the next song loads synchronously (URL cached).
  state.nextTrack('ended');
  engine.armCrossfade(0);
}

// Warm the next track's stream URL whenever what "next" is changes — a
// track starting, an auto top-up landing, a shuffle, a queue edit. With the
// screen off, mobile browsers suspend the page as soon as the current song
// ends; if the 'ended' handler has to fetch a URL before calling play(),
// that fetch never finishes and playback silently stops. With the URL
// cached, playTrack switches tracks synchronously inside 'ended'.
usePlayerStore.subscribe((state, prev) => {
  const next = upcomingTrack(state);
  if (next && next.id !== upcomingTrack(prev)?.id) prefetchTrackStream(next);
  // Top up whenever the upcoming list runs low — a track starting, songs
  // removed or jumped past, or (via playback time updates) a retry after an
  // empty refill. maybeTopUpQueue returns early when there's enough queued.
  if (state.currentTrack) state.maybeTopUpQueue();
  saveSession(state, prev);
});

/** On logout: stop and forget what was playing, so the next person doesn't see it. */
export function resetPlayerSession() {
  getAudioEngine().pause();
  resumeAt = 0;
  usePlayerStore.setState({
    currentTrack: null, streamUrl: null, queue: [], originalQueue: [], currentIndex: -1, userQueue: [],
    queueSource: null, recommendedIds: [], isPlaying: false, currentTime: 0, duration: 0,
    isExpanded: false, isQueueOpen: false,
  });
}
