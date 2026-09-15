"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Playlist } from "@/types/music";

interface PlaylistCardProps {
  playlist: Playlist;
}

export const PlaylistCard = memo(function PlaylistCard({ playlist }: PlaylistCardProps) {
  return (
    <Link href={`/playlist/${playlist.id}`} className="flex-shrink-0 group cursor-pointer w-48 block">
      <div className="relative rounded-2xl overflow-hidden aspect-square glass-card mb-4 group-hover:scale-[1.04] transition-all duration-300">
        {playlist.cover ? (
          <Image
            src={playlist.cover}
            alt={playlist.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 192px, 256px"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-white/20">queue_music</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 bg-white/10 border border-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-2xl">playlist_play</span>
          </div>
        </div>
      </div>
      <h3 className="font-semibold text-sm text-white/80 group-hover:text-white transition-colors truncate mb-1">
        {playlist.title}
      </h3>
      <p className="text-white/50 text-xs truncate">
        {playlist.tracksCount} track{playlist.tracksCount !== 1 ? "s" : ""}
      </p>
    </Link>
  );
});
