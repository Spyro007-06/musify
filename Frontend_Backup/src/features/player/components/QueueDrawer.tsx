"use client";

import Image from "next/image";
import { usePlayerStore } from "@/features/player/store/player-store";
import { formatDuration } from "@/shared/utils/utils";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/shared/utils/utils";

export function QueueDrawer() {
  const { queue, currentTrack, isQueueOpen, toggleQueue, playTrack, removeFromQueue } = usePlayerStore();

  return (
    <AnimatePresence>
      {isQueueOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={toggleQueue} />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 z-50 h-screen w-80 md:w-96 bg-[#0d150d] border-l border-white/10 shadow-2xl flex flex-col p-6 select-none"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Play Queue</h3>
                <p className="text-white/40 text-xs mt-0.5">{queue.length} track{queue.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={toggleQueue}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Currently Playing track header */}
            {currentTrack && (
              <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] uppercase tracking-widest text-[#4cf479] font-bold">Now Playing</span>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden relative flex-shrink-0">
                    {currentTrack.artwork ? (
                      <Image
                        src={currentTrack.artwork}
                        alt={currentTrack.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/20">music_note</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-white truncate">{currentTrack.title}</h4>
                    <p className="text-white/50 text-xs truncate mt-0.5">
                      {currentTrack.artists.map((a) => a.name).join(", ")}
                    </p>
                  </div>
                  <span className="text-xs text-white/40">{formatDuration(currentTrack.duration)}</span>
                </div>
              </div>
            )}

            {/* Queue list */}
            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
              <span className="text-xs font-bold text-white/40 block mb-2 px-1">Next Up</span>
              {queue.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={`${track.id}-${index}`}
                    onClick={() => playTrack(track)}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border border-transparent group hover:bg-white/5",
                      isCurrent && "bg-white/5 border-white/5"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0">
                      {track.artwork ? (
                        <Image
                          src={track.artwork}
                          alt={track.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white/20">music_note</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4
                        className={cn(
                          "font-semibold text-xs truncate",
                          isCurrent ? "text-[#4cf479]" : "text-white"
                        )}
                      >
                        {track.title}
                      </h4>
                      <p className="text-white/50 text-[10px] truncate mt-0.5">
                        {track.artists.map((a) => a.name).join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-white/40">{formatDuration(track.duration)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(index);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {queue.length === 0 && (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-4xl text-white/20 mb-2">queue_music</span>
                  <p className="text-xs text-white/40">Queue is empty</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
