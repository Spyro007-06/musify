"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { musicService } from "@/services/music";
import { usePlayerStore } from "@/features/player/store/player-store";
import { formatDuration } from "@/shared/utils/utils";

export default function HistoryPage() {
  const setQueue = usePlayerStore((state) => state.setQueue);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["history"],
    queryFn: ({ pageParam }) => musicService.getRecentlyPlayed(pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length + 1 : undefined;
    },
  });

  const historyTracks = data ? data.pages.flat() : [];

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRowClick = (idx: number) => {
    const track = historyTracks[idx];
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      setQueue(historyTracks, idx);
    }
  };

  return (
    <div className="space-y-12 select-none py-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Recently Played</h2>
        <p className="text-white/40 text-xs">A record of your high-fidelity auditory experiences.</p>
      </div>

      <section className="pb-12">
        <div className="space-y-2 max-w-2xl">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 animate-pulse">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-6 h-4 bg-white/5 rounded" />
                  <div className="w-11 h-11 bg-white/5 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-white/5 rounded" />
                    <div className="h-3 w-20 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="h-4 w-12 bg-white/5 rounded" />
              </div>
            ))
          ) : (
            historyTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => handleRowClick(idx)}
                  className="flex items-center justify-between p-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors group"
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
                        className={`font-semibold text-sm block truncate ${
                          isCurrent ? "text-[#4cf479]" : "text-white"
                        }`}
                      >
                        {track.title}
                      </span>
                      <span className="text-[10px] text-white/40 block mt-0.5">
                        {track.artists.map((a) => a.name).join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="text-xs text-white/40 font-semibold">{formatDuration(track.duration)}</span>
                  </div>
                </div>
              );
            })
          )}

          {!isLoading && historyTracks.length === 0 && (
            <div className="py-24 text-center glass-card rounded-3xl border border-white/5">
              <span className="material-symbols-outlined text-5xl text-white/20 mb-3">history</span>
              <p className="text-sm text-white/55 font-black mb-1">Your listening history is empty</p>
              <p className="text-xs text-white/30 max-w-xs mx-auto">
                Play any track from the dashboard, search, or albums, and your history will be compiled here.
              </p>
            </div>
          )}

          {hasNextPage && (
            <div ref={ref} className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
