"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { musicService } from "@/services/music";
import { usePlayerStore } from "@/features/player/store/player-store";
import { formatDuration } from "@/shared/utils/utils";
import type { Track } from "@/types/music";
import { TrackActionMenu } from "@/shared/components/ui/TrackActionMenu";

export default function AlbumDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const setQueue = usePlayerStore((state) => state.setQueue);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const { data: album, isLoading } = useQuery({
    queryKey: ["album", id],
    queryFn: () => musicService.getAlbum(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-8 select-none animate-pulse">
        <div className="relative rounded-[32px] p-8 md:p-12 bg-white/5 border border-white/10 flex flex-col md:flex-row items-center gap-8 min-h-[220px]">
          <div className="w-40 h-40 rounded-2xl bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="h-4 bg-white/10 rounded w-20 mx-auto md:mx-0" />
            <div className="h-8 bg-white/10 rounded w-1/2 mx-auto md:mx-0" />
            <div className="h-4 bg-white/10 rounded w-1/3 mx-auto md:mx-0" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="text-center py-24 glass-card rounded-3xl border border-white/5">
        <span className="material-symbols-outlined text-5xl text-white/20 mb-4">album</span>
        <h3 className="text-lg font-bold text-white mb-1">Album not found</h3>
        <p className="text-xs text-white/40">This album is not available or could not be loaded.</p>
      </div>
    );
  }

  const title = album.title;
  const artistName = album.artist?.name || "Various Artists";
  const cover = album.artwork || "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&q=80";
  const tracks = album.tracks || [];

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      setQueue(tracks, 0);
    }
  };

  const handleRowPlay = (idx: number) => {
    if (currentTrack?.id === tracks[idx].id) {
      togglePlay();
    } else {
      setQueue(tracks, idx);
    }
  };

  return (
    <div className="space-y-8 select-none">
      <div className="relative rounded-[32px] p-8 md:p-12 bg-gradient-to-br from-[#4720ca] via-[#0b0b0f] to-[#0b0b0f] border border-white/5 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
        <div className="w-40 h-40 rounded-2xl relative overflow-hidden flex-shrink-0 shadow-lg bg-white/5">
          <Image src={cover} alt={title} fill className="object-cover" />
        </div>
        <div className="flex-1 text-center md:text-left space-y-3">
          <span className="text-xs uppercase tracking-widest text-[#4cf479] font-bold">Album</span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">{title}</h1>
          <p className="text-white/60 text-xs md:text-sm font-semibold max-w-lg leading-relaxed">
            By {artistName} • {tracks.length} track{tracks.length !== 1 ? "s" : ""}
          </p>
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
        </div>
      </div>

      {/* Track list table */}
      <section className="pb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
              {tracks.map((track, idx) => {
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
                    <td className="py-4 pl-4 font-semibold text-sm">
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
              })}
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
