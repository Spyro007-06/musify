"use client";

import { useQuery } from "@tanstack/react-query";
import { musicService } from "@/services/music";
import { AlbumCard } from "@/shared/components/cards/AlbumCard";
import type { Track } from "@/types/music";

interface TrendingRowProps {
  languages: string[];
  artists: string[];
}

export function TrendingRow({ languages, artists }: TrendingRowProps) {
  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ["trending-tracks", languages, artists],
    queryFn: () => musicService.getTrending(languages, artists),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="flex gap-6 overflow-x-auto hide-scrollbar -mx-6 px-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-48 flex-shrink-0 space-y-3">
              <div className="aspect-square w-full bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-4 w-3/4 bg-white/5 rounded-md animate-pulse" />
              <div className="h-3 w-1/2 bg-white/5 rounded-md animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const albumsMap = new Map<string, any>();
  tracks.forEach((track) => {
    if (track.album && track.album.id) {
      if (!albumsMap.has(track.album.id)) {
        albumsMap.set(track.album.id, {
          id: track.album.id,
          title: track.album.title,
          artwork: track.album.artwork || track.artwork,
          artist: track.album.artist || (track.artists && track.artists[0]) || { id: "", name: "Various Artists" },
          releaseYear: track.album.releaseYear,
        });
      }
    }
  });
  const albums = Array.from(albumsMap.values());

  if (albums.length === 0) return null;

  return (
    <section>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Trending in Your Languages</h2>
          <p className="text-xs text-white/40 mt-1">Today&apos;s most played tracks for your choice of artists & languages</p>
        </div>
      </div>
      <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </section>
  );
}
