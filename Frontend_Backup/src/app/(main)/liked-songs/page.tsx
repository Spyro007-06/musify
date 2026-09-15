"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { musicService } from "@/services/music";
import { usePlayerStore } from "@/features/player/store/player-store";
import { formatDuration } from "@/shared/utils/utils";
import type { Track } from "@/types/music";
import { TrackActionMenu } from "@/shared/components/ui/TrackActionMenu";

export default function LikedSongsPage() {
  const setQueue = usePlayerStore((state) => state.setQueue);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["likedSongs"],
    queryFn: ({ pageParam }) => musicService.getLikedSongs(pageParam as number, 50),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 50 ? allPages.length + 1 : undefined;
    },
  });

  const tracks = data ? data.pages.flat() : [];

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      setQueue(tracks, 0);
    }
  };

  const handleRowPlay = (idx: number) => {
    const track = tracks[idx];
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      setQueue(tracks, idx);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-[32px] p-8 md:p-12 bg-gradient-to-br from-[#4720ca] via-[#5d39d9] to-[#0b0b0f] border border-white/5 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
        <div className="w-40 h-40 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-lg relative flex-shrink-0">
          <span className="material-symbols-outlined text-7xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            favorite
          </span>
        </div>
        <div className="flex-1 text-center md:text-left space-y-3">
          <span className="text-xs uppercase tracking-widest text-white/60 font-bold">Playlist</span>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Liked Songs</h1>
          <p className="text-white/60 text-xs md:text-sm font-semibold">
            Compiled by you • {tracks.length} track{tracks.length !== 1 ? "s" : ""}
          </p>
          {tracks.length > 0 && (
            <div className="pt-2">
              <button
                onClick={handlePlayAll}
                className="bg-[#4cf479] hover:bg-[#69ff89] text-[#003913] font-bold text-xs px-6 py-3.5 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 neon-glow uppercase tracking-wider mx-auto md:mx-0"
              >
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  play_arrow
                </span>
                Play All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tracks Table */}
      <section className="pb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-[10px] font-black tracking-widest uppercase">
                <th className="py-4 pl-4 w-12 text-center">#</th>
                <th className="py-4 pl-4">Title</th>
                <th className="py-4 pl-4 hidden md:table-cell">Artist</th>
                <th className="py-4 pl-4 text-center w-24">Duration</th>
                <th className="py-4 pl-4 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-4 pl-4"><div className="h-4 w-4 bg-white/5 rounded animate-pulse mx-auto" /></td>
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-lg animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                          <div className="h-3 w-20 bg-white/5 rounded animate-pulse md:hidden" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pl-4 hidden md:table-cell"><div className="h-4 w-24 bg-white/5 rounded animate-pulse" /></td>
                    <td className="py-4 pl-4"><div className="h-4 w-12 bg-white/5 rounded animate-pulse mx-auto" /></td>
                    <td className="py-4 pl-4" />
                  </tr>
                ))
              ) : (
                tracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <tr
                      key={track.id}
                      onClick={() => handleRowPlay(idx)}
                      className="hover:bg-white/5 transition-colors cursor-pointer group rounded-xl"
                    >
                      <td className="py-4 pl-4 text-center text-sm font-bold text-white/30 group-hover:text-[#4cf479]">
                        {isCurrent && isPlaying ? (
                          <span className="material-symbols-outlined text-xs text-[#4cf479] animate-pulse">
                            equalizer
                          </span>
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="py-4 pl-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0 bg-white/5 border border-white/10">
                            {track.artwork && (
                              <Image
                                src={track.artwork}
                                alt={track.title}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <span
                              className={`font-semibold text-sm block ${
                                isCurrent ? "text-[#4cf479]" : "text-white"
                              }`}
                            >
                              {track.title}
                            </span>
                            <span className="text-[10px] text-white/40 md:hidden mt-0.5 block">
                              {track.artists.map((a) => a.name).join(", ")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pl-4 text-sm text-white/60 hidden md:table-cell">
                        {track.artists.map((a) => a.name).join(", ")}
                      </td>
                      <td className="py-4 pl-4 text-center text-xs text-white/40 font-semibold">
                        {formatDuration(track.duration)}
                      </td>
                      <td className="py-4 pl-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTrack(track);
                            setMenuPosition({ x: e.clientX, y: e.clientY });
                          }}
                          className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-opacity"
                        >
                          <span className="material-symbols-outlined text-lg">more_horiz</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              {!isLoading && tracks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <span className="material-symbols-outlined text-5xl text-white/10 mb-3">favorite</span>
                    <p className="text-sm text-white/45 font-black mb-1">Your liked songs list is empty</p>
                    <p className="text-xs text-white/30 max-w-xs mx-auto">
                      Explore the dashboard or search for tracks, then click the heart icon to save them here.
                    </p>
                  </td>
                </tr>
              )}
              {hasNextPage && (
                <tr ref={ref}>
                  <td colSpan={5} className="py-8 text-center">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {activeTrack && (
        <TrackActionMenu
          track={activeTrack}
          position={menuPosition}
          onClose={() => setActiveTrack(null)}
        />
      )}
    </div>
  );
}
