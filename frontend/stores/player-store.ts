import { create } from 'zustand';
import { Track } from '@/types/track';
import { DEFAULT_VOLUME } from '@/lib/player/player-constants';
import { shuffleArray } from '@/lib/player/player-utils';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  originalQueue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;

  // Actions
  setTrack: (track: Track, queue?: Track[]) => void;
  setQueue: (queue: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seek: (progress: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: DEFAULT_VOLUME,
  isMuted: false,
  shuffle: false,
  repeat: 'off',

  setTrack: (track, queue) => {
    const newQueue = queue && queue.length > 0 ? queue : [track];
    const index = newQueue.findIndex((t) => t.id === track.id);
    set({
      currentTrack: track,
      queue: newQueue,
      originalQueue: newQueue,
      currentIndex: index !== -1 ? index : 0,
      isPlaying: true,
      progress: 0,
    });
  },

  setQueue: (queue, startIndex = 0) => {
    const track = queue[startIndex] || null;
    set({
      queue,
      originalQueue: queue,
      currentTrack: track,
      currentIndex: startIndex,
      isPlaying: !!track,
      progress: 0,
    });
  },

  addToQueue: (track) => {
    set((state) => ({
      queue: [...state.queue, track],
      originalQueue: [...state.originalQueue, track],
    }));
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  nextTrack: () => {
    const { queue, currentIndex, repeat, shuffle } = get();
    if (queue.length === 0) return;

    if (repeat === 'one') {
      set({ progress: 0, isPlaying: true });
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      set({
        currentIndex: nextIndex,
        currentTrack: queue[nextIndex],
        progress: 0,
        isPlaying: true,
      });
    } else if (repeat === 'all') {
      set({
        currentIndex: 0,
        currentTrack: queue[0],
        progress: 0,
        isPlaying: true,
      });
    } else {
      set({ isPlaying: false });
    }
  },

  previousTrack: () => {
    const { queue, currentIndex, progress } = get();
    if (queue.length === 0) return;

    if (progress > 3) {
      set({ progress: 0 });
      return;
    }

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      set({
        currentIndex: prevIndex,
        currentTrack: queue[prevIndex],
        progress: 0,
        isPlaying: true,
      });
    } else {
      set({ progress: 0 });
    }
  },

  seek: (progress) => set({ progress }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleShuffle: () => {
    const { shuffle, queue, currentTrack, originalQueue } = get();
    const newShuffle = !shuffle;

    if (newShuffle) {
      const remaining = queue.filter((t) => t.id !== currentTrack?.id);
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
  },

  cycleRepeat: () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const { repeat } = get();
    const nextMode = modes[(modes.indexOf(repeat) + 1) % modes.length];
    set({ repeat: nextMode });
  },
}));
