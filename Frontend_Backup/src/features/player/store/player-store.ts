"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track } from "@/types/music";
import { musicService } from "@/services/music";

type RepeatMode = "off" | "one" | "all";

type PlayerState = {
  queue: Track[];
  currentTrack: Track | null;
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  repeat: RepeatMode;
  shuffle: boolean;
  progress: number; // 0-100
  duration: number; // seconds
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isExpanded: boolean;
  accentColor: string | null;

  setQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  toggleQueue: () => void;
  toggleLyrics: () => void;
  toggleExpanded: () => void;
  likeCurrentTrack: () => void;
  setAccentColor: (color: string | null) => void;
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      currentTrack: null,
      currentIndex: -1,
      isPlaying: false,
      volume: 80,
      isMuted: false,
      repeat: "off",
      shuffle: false,
      progress: 0,
      duration: 0,
      isQueueOpen: false,
      isLyricsOpen: false,
      isExpanded: false,
      accentColor: null,

      setAccentColor: (color) => set({ accentColor: color }),

      setQueue: (tracks, startIndex = 0) =>
        set({
          queue: tracks,
          currentTrack: tracks[startIndex] ?? null,
          currentIndex: startIndex,
          isPlaying: true,
        }),

      playTrack: (track) => {
        const { queue } = get();
        const idx = queue.findIndex((t) => t.id === track.id);
        set({
          currentTrack: track,
          currentIndex: idx >= 0 ? idx : 0,
          isPlaying: true,
          progress: 0,
        });
      },

      addToQueue: (track) =>
        set((state) => ({ queue: [...state.queue, track] })),

      removeFromQueue: (index) =>
        set((state) => ({
          queue: state.queue.filter((_, i) => i !== index),
        })),

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

      nextTrack: () => {
        const { queue, currentIndex, shuffle, repeat } = get();
        if (!queue.length) return;
        let nextIndex: number;
        if (shuffle) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else if (repeat === "one") {
          nextIndex = currentIndex;
        } else {
          nextIndex = (currentIndex + 1) % queue.length;
        }
        set({ currentTrack: queue[nextIndex], currentIndex: nextIndex, isPlaying: true, progress: 0 });
      },

      prevTrack: () => {
        const { queue, currentIndex, progress } = get();
        if (!queue.length) return;
        if (progress > 10) {
          set({ progress: 0 });
          return;
        }
        const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
        set({ currentTrack: queue[prevIndex], currentIndex: prevIndex, isPlaying: true, progress: 0 });
      },

      setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

      cycleRepeat: () =>
        set((state) => ({
          repeat:
            state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off",
        })),

      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen, isLyricsOpen: false })),
      toggleLyrics: () => set((state) => ({ isLyricsOpen: !state.isLyricsOpen, isQueueOpen: false })),
      toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

      likeCurrentTrack: async () => {
        const { currentTrack, queue } = get();
        if (!currentTrack) return;

        const trackId = currentTrack.id;
        const willLike = !currentTrack.isLiked;

        // Optimistically update UI state
        const updated = { ...currentTrack, isLiked: willLike };
        set({
          currentTrack: updated,
          queue: queue.map((t) => (t.id === updated.id ? updated : t)),
        });

        try {
          if (willLike) {
            await musicService.likeTrack(trackId);
          } else {
            await musicService.unlikeTrack(trackId);
          }
        } catch (error) {
          console.error("Failed to update track like state in backend:", error);
          // Rollback on error
          const rollback = { ...currentTrack, isLiked: !willLike };
          set({
            currentTrack: rollback,
            queue: queue.map((t) => (t.id === rollback.id ? rollback : t)),
          });
        }
      },
    }),
    {
      name: "vibe-player",
      partialize: (state) => ({ volume: state.volume, repeat: state.repeat, shuffle: state.shuffle }),
    }
  )
);
