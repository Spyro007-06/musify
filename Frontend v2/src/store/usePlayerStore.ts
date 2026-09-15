import { create } from 'zustand';
import type { MusicItem } from '../hooks/useMusic';
import { likeTrackApi, unlikeTrackApi } from '../hooks/useMusic';
import { queryClient } from '../lib/queryClient';

type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  currentTrack: MusicItem | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  queue: MusicItem[];
  originalQueue: MusicItem[]; // Before shuffle
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  
  // Actions
  playTrack: (track: MusicItem, context?: MusicItem[]) => void;
  togglePlayPause: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setQueue: (tracks: MusicItem[]) => void;
  addToQueue: (track: MusicItem) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrev: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: (trackId: string) => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function findTrackInCache(trackId: string): any | null {
  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.getAll();
  for (const q of queries) {
    const data: any = q.state.data;
    if (!data) continue;
    if (Array.isArray(data)) {
      const found = data.find(t => t && t.id === trackId);
      if (found) return found;
    }
    if (data.tracks && Array.isArray(data.tracks)) {
      const found = data.tracks.find((t: any) => t && t.id === trackId);
      if (found) return found;
    }
  }
  return null;
}

function updateQueriesLikeState(trackId: string, nextIsLiked: boolean) {
  // Update Liked Songs list cache
  queryClient.setQueriesData<any[]>({ queryKey: ['liked-songs'] }, (old) => {
    if (!old) return old;
    if (nextIsLiked) {
      const track = findTrackInCache(trackId);
      if (track && !old.some(t => t.id === trackId)) {
        return [{ ...track, isLiked: true }, ...old];
      }
      return old;
    } else {
      return old.filter(t => t.id !== trackId);
    }
  });

  const mapTrackList = (old: any) => {
    if (!old) return old;
    if (Array.isArray(old)) {
      return old.map(t => t && t.id === trackId ? { ...t, isLiked: nextIsLiked } : t);
    }
    // Search results structure
    if (old.tracks && Array.isArray(old.tracks)) {
      return {
        ...old,
        tracks: old.tracks.map((t: any) => t && t.id === trackId ? { ...t, isLiked: nextIsLiked } : t)
      };
    }
    return old;
  };

  // Invalidate and optimistically update all lists
  const queryKeys = [['trending'], ['recommended'], ['search'], ['album'], ['playlist']];
  for (const k of queryKeys) {
    queryClient.setQueriesData({ queryKey: k }, mapTrackList);
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.5,
  progress: 0,
  duration: 0,
  queue: [],
  originalQueue: [],
  shuffleEnabled: false,
  repeatMode: 'off' as RepeatMode,

  playTrack: (track, context) => {
    const state = get();
    // If same track, toggle play/pause
    if (state.currentTrack?.id === track.id) {
      set({ isPlaying: !state.isPlaying });
      return;
    }
    
    // If context provided (album/playlist), set queue
    if (context && context.length > 0) {
      const playableTracks = context.filter(t => t.audioUrl);
      const ordered = playableTracks;
      const shuffled = state.shuffleEnabled ? shuffleArray(ordered) : ordered;
      set({ 
        currentTrack: track, 
        isPlaying: true, 
        progress: 0, 
        queue: shuffled, 
        originalQueue: ordered 
      });
    } else {
      set({ currentTrack: track, isPlaying: true, progress: 0 });
    }
  },

  togglePlayPause: () => {
    const { currentTrack, isPlaying } = get();
    if (currentTrack) {
      set({ isPlaying: !isPlaying });
    }
  },

  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  
  setQueue: (tracks) => {
    const state = get();
    const shuffled = state.shuffleEnabled ? shuffleArray(tracks) : tracks;
    set({ queue: shuffled, originalQueue: tracks });
  },

  addToQueue: (track) => {
    set((state) => ({ 
      queue: [...state.queue, track],
      originalQueue: [...state.originalQueue, track]
    }));
  },

  removeFromQueue: (trackId) => {
    set((state) => ({
      queue: state.queue.filter(t => t.id !== trackId),
      originalQueue: state.originalQueue.filter(t => t.id !== trackId),
    }));
  },

  clearQueue: () => set({ queue: [], originalQueue: [] }),

  playNext: () => {
    const { currentTrack, queue, repeatMode } = get();
    if (!currentTrack || queue.length === 0) {
      if (repeatMode === 'one' && currentTrack) {
        set({ progress: 0, isPlaying: true });
      }
      return;
    }
    
    if (repeatMode === 'one') {
      set({ progress: 0, isPlaying: true });
      return;
    }

    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    if (currentIndex !== -1 && currentIndex < queue.length - 1) {
      set({ currentTrack: queue[currentIndex + 1], isPlaying: true, progress: 0 });
    } else if (repeatMode === 'all' && queue.length > 0) {
      // Wrap around to the beginning
      set({ currentTrack: queue[0], isPlaying: true, progress: 0 });
    }
  },

  playPrev: () => {
    const { currentTrack, queue, progress } = get();
    if (!currentTrack || queue.length === 0) return;
    
    // If more than 3 seconds in, restart the current track
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }

    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      set({ currentTrack: queue[currentIndex - 1], isPlaying: true, progress: 0 });
    } else {
      set({ progress: 0 });
    }
  },

  toggleShuffle: () => {
    const state = get();
    const nowShuffle = !state.shuffleEnabled;
    if (nowShuffle) {
      const shuffled = shuffleArray(state.originalQueue);
      set({ shuffleEnabled: true, queue: shuffled });
    } else {
      set({ shuffleEnabled: false, queue: state.originalQueue });
    }
  },

  cycleRepeat: () => {
    const current = get().repeatMode;
    const next: RepeatMode = current === 'off' ? 'all' : current === 'all' ? 'one' : 'off';
    set({ repeatMode: next });
  },

  toggleLike: async (trackId) => {
    const { currentTrack } = get();
    const isCurrent = currentTrack?.id === trackId;
    
    let wasLiked = false;
    if (isCurrent && currentTrack) {
      wasLiked = !!currentTrack.isLiked;
    } else {
      const likedSongs = queryClient.getQueryData<any[]>(['liked-songs']);
      wasLiked = likedSongs?.some(t => t.id === trackId) || false;
    }
    
    const nextIsLiked = !wasLiked;
    
    // Optimistic UI updates
    if (isCurrent && currentTrack) {
      set({ currentTrack: { ...currentTrack, isLiked: nextIsLiked } });
    }
    updateQueriesLikeState(trackId, nextIsLiked);
    
    try {
      if (wasLiked) {
        await unlikeTrackApi(trackId);
      } else {
        await likeTrackApi(trackId);
      }
      queryClient.invalidateQueries({ queryKey: ['liked-songs'] });
    } catch {
      if (isCurrent && currentTrack) {
        set({ currentTrack: { ...currentTrack, isLiked: wasLiked } });
      }
      updateQueriesLikeState(trackId, wasLiked);
    }
  },
}));
