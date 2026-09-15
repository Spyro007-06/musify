"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { artistService } from "@/services/artist";
import { usePlayerStore } from "@/features/player/store/player-store";
import { formatDuration, formatCount } from "@/shared/utils/utils";
import type { Track } from "@/types/music";

export default function ArtistDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const setQueue = usePlayerStore((state) => state.setQueue);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  const [isFollowing, setIsFollowing] = useState(false);

  const { data: artist } = useQuery({
    queryKey: ["artist", id],
    queryFn: async () => {
      const data = await artistService.getArtist(id);
      if (data) {
        setIsFollowing(data.isFollowing || false);
      }
      return data;
    },
    enabled: !!id,
  });

  const { data: topTracks = [], isLoading: isTracksLoading } = useQuery<Track[]>({
    queryKey: ["artist-tracks", id],
    queryFn: () => artistService.getArtistTopTracks(id),
    enabled: !!id,
  });

  const name = artist?.name || "Loading Artist...";
  const image = artist?.image || "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&q=80";
  const followers = artist?.followers || 0;
  const verified = artist?.isVerified !== undefined ? artist.isVerified : true;
  const bio = artist?.bio || "Official profile on Musify.";

  const handlePlayAll = () => {
    if (topTracks.length > 0) {
      setQueue(topTracks, 0);
    }
  };

  const handleRowPlay = (idx: number) => {
    if (currentTrack?.id === topTracks[idx].id) {
      togglePlay();
    } else {
      setQueue(topTracks, idx);
    }
  };

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        await artistService.unfollowArtist(id);
        setIsFollowing(false);
      } else {
        await artistService.followArtist(id);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Failed to toggle follow status:", err);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Visual Header Panel */}
      <div className="relative rounded-[32px] overflow-hidden aspect-[21/9] flex items-end p-8 md:p-12 shadow-2xl border border-white/5">
        <div className="absolute inset-0 z-0">
          <Image src={image} alt={name} fill className="object-cover opacity-60" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        </div>

        <div className="relative z-10 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            {verified && (
              <span className="bg-[#4cf479]/20 text-[#4cf479] border border-[#4cf479]/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                Verified Artist
              </span>
            )}
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none">{name}</h1>
            <p className="text-white/60 text-xs md:text-sm font-semibold">
              {formatCount(followers)} followers • {bio}
            </p>
          </div>

          <div className="flex gap-4 items-center justify-center">
            <button
              onClick={handlePlayAll}
              disabled={topTracks.length === 0}
              className="bg-[#4cf479] hover:bg-[#69ff89] text-[#003913] font-bold text-xs px-6 py-3.5 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 neon-glow uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                play_arrow
              </span>
              Play popular
            </button>
            <button
              onClick={handleFollowToggle}
              className={`font-bold text-xs px-6 py-3.5 rounded-full border transition-all ${
                isFollowing
                  ? "bg-[#4cf479]/10 border-[#4cf479] text-[#4cf479]"
                  : "bg-white/10 border-white/20 text-white hover:bg-white/20"
              }`}
            >
              {isFollowing ? "FOLLOWING" : "FOLLOW"}
            </button>
          </div>
        </div>
      </div>

      {/* Popular Tracks list */}
      <section className="pt-6">
        <h3 className="text-lg font-bold text-white mb-6">Popular Tracks</h3>
        <div className="space-y-2">
          {isTracksLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 animate-pulse">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-6 h-4 bg-white/10 rounded" />
                  <div className="w-11 h-11 bg-white/10 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-white/10 rounded w-1/3" />
                    <div className="h-3 bg-white/10 rounded w-1/4" />
                  </div>
                </div>
                <div className="w-16 h-4 bg-white/10 rounded" />
              </div>
            ))
          ) : topTracks.length > 0 ? (
            topTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => handleRowPlay(idx)}
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
                    <button className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-opacity">
                      <span className="material-symbols-outlined text-lg">favorite</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 glass-card rounded-2xl border border-white/5">
              <span className="material-symbols-outlined text-4xl text-white/20 mb-2">music_note</span>
              <p className="text-xs text-white/40">No popular tracks found for this artist.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
