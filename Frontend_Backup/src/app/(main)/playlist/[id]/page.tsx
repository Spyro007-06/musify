"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { playlistService } from "@/services/playlist";
import { usePlayerStore } from "@/features/player/store/player-store";
import { formatDuration } from "@/shared/utils/utils";
import type { Track } from "@/types/music";
import { TrackActionMenu } from "@/shared/components/ui/TrackActionMenu";

const MOCK_TRACKS: Track[] = [
  {
    id: "rec-1",
    title: "Midnight Echo",
    duration: 225,
    artwork: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    artists: [{ id: "art-1", name: "Ethereal State" }],
  },
  {
    id: "rec-2",
    title: "Prism Drift",
    duration: 184,
    artwork: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    artists: [{ id: "art-2", name: "The Synthesis" }],
  },
];

export default function PlaylistDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const setQueue = usePlayerStore((state) => state.setQueue);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const { data: playlist } = useQuery({
    queryKey: ["playlist", id],
    queryFn: () => playlistService.getPlaylist(id),
    enabled: !!id,
  });

  const title = playlist?.title || "Curated Playlist";
  const desc = playlist?.description || "Curated mood-based high fidelity soundscapes.";
  const cover = playlist?.cover || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80";
  const tracks = playlist?.tracks || MOCK_TRACKS;

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
    <div className="space-y-8">
      <div className="relative rounded-[32px] p-8 md:p-12 bg-gradient-to-br from-[#4720ca] via-[#0b0b0f] to-[#0b0b0f] border border-white/5 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
        <div className="w-40 h-40 rounded-2xl relative overflow-hidden flex-shrink-0 shadow-lg bg-white/5">
          <Image src={cover} alt={title} fill className="object-cover" />
        </div>
        <div className="flex-1 text-center md:text-left space-y-3">
          <span className="text-xs uppercase tracking-widest text-[#4cf479] font-bold">Playlist</span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">{title}</h1>
          <p className="text-white/60 text-xs md:text-sm font-semibold max-w-lg leading-relaxed">{desc}</p>
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
