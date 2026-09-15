"use client";

import { memo } from "react";
import Image from "next/image";
import { usePlayerStore } from "@/features/player/store/player-store";
import type { Track } from "@/types/music";
import { cn } from "@/shared/utils/utils";

interface MusicCardProps {
  track: Track;
  tracksQueue?: Track[];
}

export const MusicCard = memo(function MusicCard({ track, tracksQueue = [track] }: MusicCardProps) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  const isCurrent = currentTrack?.id === track.id;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      // Find track index inside queue
      const idx = tracksQueue.findIndex((t) => t.id === track.id);
      setQueue(tracksQueue, idx >= 0 ? idx : 0);
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className="flex-shrink-0 group cursor-pointer w-48 select-none"
    >
      <div className="relative rounded-2xl overflow-hidden aspect-square glass-card mb-4 group-hover:scale-[1.04] transition-all duration-300">
        {track.artwork ? (
          <Image
            src={track.artwork}
            alt={track.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 192px, 256px"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-white/20">music_note</span>
          </div>
        )}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center",
            isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <button
            onClick={handlePlayClick}
            className="w-14 h-14 bg-[#4cf479] rounded-full flex items-center justify-center text-[#003913] neon-glow translate-y-4 group-hover:translate-y-0 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-3xl font-black" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isCurrent && isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>
        </div>
      </div>
      <h3
        className={cn(
          "font-semibold text-sm group-hover:text-white transition-colors truncate mb-1",
          isCurrent ? "text-[#4cf479]" : "text-white/80"
        )}
      >
        {track.title}
      </h3>
      <p className="text-white/50 text-xs truncate">
        {track.artists.map((a) => a.name).join(", ")}
      </p>
    </div>
  );
});
