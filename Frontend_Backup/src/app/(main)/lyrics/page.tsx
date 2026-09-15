"use client";

import { usePlayerStore } from "@/features/player/store/player-store";
import { motion } from "framer-motion";
import { cn } from "@/shared/utils/utils";

// Mock lyrics mapped by track title / artist
const LYRICS_DATABASE: Record<string, { time: number; text: string }[]> = {
  default: [
    { time: 0, text: "🎵 Instrumental Intro" },
    { time: 10, text: "Floating high above the starlit sky" },
    { time: 24, text: "Looking back at lines that faded out" },
    { time: 38, text: "Every beat and pulse is coming alive" },
    { time: 52, text: "We are chasing shadows in the dark" },
    { time: 66, text: "Hear the rhythm speak without a sound" },
    { time: 80, text: "🎵 Instrumental Breakdown" },
    { time: 104, text: "We are neon dreams under purple rain" },
    { time: 118, text: "Washing all our doubts and worries away" },
    { time: 132, text: "Just hold on tight to the vector drift" },
    { time: 148, text: "🎵 Outro fading out" },
  ],
};

export default function LyricsPage() {
  const { currentTrack, progress, duration } = usePlayerStore();

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center py-24 select-none">
        <span className="material-symbols-outlined text-5xl text-white/20 mb-4">music_note</span>
        <h3 className="text-lg font-bold text-white mb-1">No track playing</h3>
        <p className="text-xs text-white/40">Play a track to view synced lyrics.</p>
      </div>
    );
  }

  const lyrics = LYRICS_DATABASE[currentTrack.title] || LYRICS_DATABASE.default;
  const currentTime = (progress / 100) * duration;

  // Find active line
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    }
  }

  return (
    <div className="space-y-12 select-none py-6 max-w-xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Synced Lyrics</h2>
        <p className="text-[#4cf479] text-xs font-semibold">{currentTrack.title}</p>
      </div>

      <div className="space-y-8 py-12 flex flex-col items-center justify-start min-h-[400px]">
        {lyrics.map((line, index) => {
          const isActive = index === activeIndex;
          const isPassed = index < activeIndex;

          return (
            <motion.p
              key={index}
              className={cn(
                "text-center text-lg md:text-xl font-bold transition-all duration-300 max-w-md cursor-pointer",
                isActive
                  ? "text-[#4cf479] scale-105"
                  : isPassed
                    ? "text-white/60"
                    : "text-white/20"
              )}
              layout
            >
              {line.text}
            </motion.p>
          );
        })}
      </div>
    </div>
  );
}
