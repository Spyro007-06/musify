"use client";

import { usePlayerStore } from "@/features/player/store/player-store";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
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

export function LyricsView() {
  const { currentTrack, isLyricsOpen, toggleLyrics, progress, duration } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<"lyrics" | "insights">("lyrics");

  const isOpen = !!(currentTrack && isLyricsOpen);
  const lyrics = currentTrack ? (LYRICS_DATABASE[currentTrack.title] || LYRICS_DATABASE.default) : [];
  const currentTime = (progress / 100) * duration;

  // Find active line
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    }
  }

  return (
    <AnimatePresence>
      {isOpen && currentTrack && (
        <>
          {/* Backdrop */}
          <div
            key="lyrics-backdrop"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={toggleLyrics}
          />

          {/* Panel */}
          <motion.div
            key="lyrics-panel"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 h-screen w-80 md:w-96 bg-[#0d150d] border-l border-white/10 shadow-2xl flex flex-col p-6 select-none"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Song Lyrics</h3>
                <p className="text-white/40 text-xs mt-0.5">{currentTrack.title}</p>
              </div>
              <button
                onClick={toggleLyrics}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="flex gap-2 mb-4 bg-black/20 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("lyrics")}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors",
                  activeTab === "lyrics" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80"
                )}
              >
                Lyrics
              </button>
              <button
                onClick={() => setActiveTab("insights")}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1",
                  activeTab === "insights" ? "bg-white/10 text-[#4cf479]" : "text-white/40 hover:text-white/80"
                )}
              >
                <span className="material-symbols-outlined text-[14px]">psychiatry</span>
                AI Insights
              </button>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-6 py-2 px-1 flex flex-col items-center justify-start">
              {activeTab === "lyrics" ? (
                lyrics.map((line, index) => {
                  const isActive = index === activeIndex;
                  const isPassed = index < activeIndex;

                  return (
                    <motion.p
                      key={index}
                      className={cn(
                        "text-center text-sm font-bold transition-all duration-300 max-w-xs",
                        isActive
                          ? "text-[#4cf479] text-base scale-105"
                          : isPassed
                            ? "text-white/60"
                            : "text-white/20"
                      )}
                      layout
                    >
                      {line.text}
                    </motion.p>
                  );
                })
              ) : (
                <div className="w-full bg-white/5 rounded-xl p-4 text-sm text-white/80 space-y-5 text-left border border-white/5 shadow-inner">
                  <div>
                    <h4 className="text-[#4cf479] font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">mood</span> Mood
                    </h4>
                    <p>Upbeat / Motivational</p>
                  </div>
                  <div>
                    <h4 className="text-[#4cf479] font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">lightbulb</span> Meaning
                    </h4>
                    <p>This track represents overcoming personal challenges and finding inner strength through rhythmic expression.</p>
                  </div>
                  <div>
                    <h4 className="text-[#4cf479] font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span> Trivia
                    </h4>
                    <p>The artist conceptualized this beat during their 2023 world tour while visiting Tokyo.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
export default LyricsView;
