"use client";

import { useQuery } from "@tanstack/react-query";
import { musicService } from "@/services/music";
import { MusicCard } from "@/shared/components/cards/MusicCard";
import { useAuthStore } from "@/features/auth/store/auth-store";
import type { Track } from "@/types/music";

export function RecentlyPlayedRow() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ["recently-played"],
    queryFn: () => musicService.getRecentlyPlayed(),
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
  });

  if (!isAuthenticated) return null;

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

  if (tracks.length === 0) return null;

  return (
    <section className="select-none">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Recently Played</h2>
          <p className="text-xs text-white/40 mt-1">Pick up right where you left off</p>
        </div>
      </div>
      <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
        {tracks.map((track, idx) => (
          <MusicCard 
            key={`${track.id}-${idx}`} 
            track={track} 
            tracksQueue={tracks} 
          />
        ))}
      </div>
    </section>
  );
}
