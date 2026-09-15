"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Track } from "@/types/music";

interface DownloadsState {
  downloadedTracks: Track[];
  isDownloadingMap: Record<string, boolean>;
  addDownload: (track: Track) => void;
  removeDownload: (trackId: string) => void;
  downloadTrack: (track: Track) => Promise<void>;
}

export const useDownloadsStore = create<DownloadsState>()(
  persist(
    (set, get) => ({
      downloadedTracks: [],
      isDownloadingMap: {},

      addDownload: (track) => {
        const { downloadedTracks } = get();
        if (downloadedTracks.some((t) => t.id === track.id)) return;
        set({ downloadedTracks: [track, ...downloadedTracks] });
      },

      removeDownload: (trackId) => {
        const { downloadedTracks } = get();
        set({ downloadedTracks: downloadedTracks.filter((t) => t.id !== trackId) });
      },

      downloadTrack: async (track) => {
        const { addDownload } = get();
        if (!track.audioUrl) return;

        // Set downloading state
        set((state) => ({
          isDownloadingMap: { ...state.isDownloadingMap, [track.id]: true }
        }));

        try {
          const response = await fetch(track.audioUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const a = document.createElement("a");
          a.href = url;
          a.download = `${track.title} - ${track.artists.map((art) => art.name).join(", ")}.mp3`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          addDownload(track);
        } catch (error) {
          console.warn("Direct blob download failed, falling back to open in tab:", error);
          // Fallback to opening the URL directly
          window.open(track.audioUrl, "_blank");
          addDownload(track);
        } finally {
          set((state) => ({
            isDownloadingMap: { ...state.isDownloadingMap, [track.id]: false }
          }));
        }
      }
    }),
    {
      name: "vibe-downloads-store",
      partialize: (state) => ({
        downloadedTracks: state.downloadedTracks
      })
    }
  )
);
