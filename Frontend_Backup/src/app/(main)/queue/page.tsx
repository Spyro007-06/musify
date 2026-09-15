"use client";

import Image from "next/image";
import { usePlayerStore } from "@/features/player/store/player-store";
import { formatDuration } from "@/shared/utils/utils";
import { cn } from "@/shared/utils/utils";

export default function QueuePage() {
  const { queue, currentTrack, isPlaying, playTrack, removeFromQueue, togglePlay } = usePlayerStore();

  const handleRowClick = (track: any, idx: number) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  return (
    <div className="space-y-12 select-none py-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Play Queue</h2>
        <p className="text-white/40 text-xs">Manage track orders and see what soundscapes are next.</p>
      </div>

      {/* Currently Playing Card */}
      {currentTrack && (
        <section>
          <h3 className="text-sm font-bold text-white/40 mb-4 tracking-wider uppercase">Now Playing</h3>
          <div
            onClick={() => togglePlay()}
            className="flex items-center justify-between p-4 rounded-3xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all max-w-2xl shadow-xl"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden relative bg-white/5 flex-shrink-0">
                {currentTrack.artwork && (
                  <Image
                    src={currentTrack.artwork}
                    alt={currentTrack.title}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-[#4cf479] text-base block truncate">{currentTrack.title}</span>
                <span className="text-white/50 text-xs block mt-1">
                  {currentTrack.artists.map((a) => a.name).join(", ")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-xs text-white/40 font-bold">{formatDuration(currentTrack.duration)}</span>
              <span className="material-symbols-outlined text-[#4cf479] text-2xl font-black">
                {isPlaying ? "pause" : "play_arrow"}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Next Up section list */}
      <section className="pb-12">
        <h3 className="text-sm font-bold text-white/40 mb-4 tracking-wider uppercase">Next Up</h3>
        <div className="space-y-2 max-w-2xl">
          {queue.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => handleRowClick(track, idx)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors group border border-transparent",
                  isCurrent && "bg-white/5 border-white/5"
                )}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="w-6 text-center text-xs font-bold text-white/30 group-hover:text-[#4cf479]">
                    {isCurrent && isPlaying ? (
                      <span className="material-symbols-outlined text-xs text-[#4cf479] animate-pulse">
                        equalizer
                      </span>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <div className="w-11 h-11 rounded-lg overflow-hidden relative flex-shrink-0 bg-white/5 border border-white/10">
                    {track.artwork && (
                      <Image
                        src={track.artwork}
                        alt={track.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "font-semibold text-sm block truncate",
                        isCurrent ? "text-[#4cf479]" : "text-white"
                      )}
                    >
                      {track.title}
                    </span>
                    <span className="text-[10px] text-white/40 block mt-0.5">
                      {track.artists.map((a) => a.name).join(", ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-white/40 font-semibold">{formatDuration(track.duration)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(idx);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
          {queue.length === 0 && (
            <div className="py-12 text-center border border-white/5 rounded-2xl bg-white/5">
              <span className="material-symbols-outlined text-4xl text-white/20 mb-2">queue_music</span>
              <p className="text-xs text-white/40">Queue is empty</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
