"use client";

import { useQuery } from "@tanstack/react-query";
import { musicService } from "@/services/music";
import { AlbumCard } from "@/shared/components/cards/AlbumCard";
import type { Album } from "@/types/music";

interface NewReleasesGridProps {
  languages: string[];
  artists: string[];
}

export function NewReleasesGrid({ languages, artists }: NewReleasesGridProps) {
  const { data: albums = [], isLoading } = useQuery<Album[]>({
    queryKey: ["new-releases", languages, artists],
    queryFn: () => musicService.getNewReleases(languages, artists),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square w-full bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-4 w-3/4 bg-white/5 rounded-md animate-pulse" />
              <div className="h-3 w-1/2 bg-white/5 rounded-md animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (albums.length === 0) return null;

  return (
    <section>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">New Releases for You</h2>
          <p className="text-xs text-white/40 mt-1">Fresh albums and singles from your selected artists & languages</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {albums.slice(0, 10).map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </section>
  );
}
