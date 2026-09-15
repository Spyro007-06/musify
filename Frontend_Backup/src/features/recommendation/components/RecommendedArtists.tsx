"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { artistService } from "@/services/artist";
import type { Artist } from "@/types/music";

interface RecommendedArtistsProps {
  artists: string[];
}

export function RecommendedArtists({ artists }: RecommendedArtistsProps) {
  const { data: recommendedList = [], isLoading } = useQuery<Artist[]>({
    queryKey: ["recommended-artists", artists],
    queryFn: () => artistService.getRecommendedArtists(artists),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="flex gap-6 overflow-x-auto hide-scrollbar -mx-6 px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center space-y-3 w-32 md:w-36">
              <div className="aspect-square w-28 h-28 md:w-32 md:h-32 bg-white/5 rounded-full animate-pulse" />
              <div className="h-4 w-3/4 bg-white/5 rounded-md animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendedList.length === 0) return null;

  return (
    <section className="select-none">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Recommended Artists</h2>
          <p className="text-xs text-white/40 mt-1">Based on your favorite languages and listening preferences</p>
        </div>
      </div>
      <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
        {recommendedList.map((artist) => (
          <Link
            key={artist.id}
            href={`/artist/${artist.id}`}
            className="flex-shrink-0 flex flex-col items-center space-y-3 w-32 md:w-36 group focus:outline-none"
          >
            {/* Round Avatar Container */}
            <div className="relative aspect-square w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border border-white/10 group-hover:border-[#4cf479] group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(76,244,121,0.2)] transition-all duration-300 bg-white/5">
              {artist.image ? (
                <Image
                  src={artist.image}
                  alt={artist.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-[#4720ca]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-white/40">person</span>
                </div>
              )}
            </div>
            
            {/* Artist Name & Verified Badge */}
            <div className="flex items-center justify-center text-center max-w-full">
              <span className="text-xs font-semibold text-white/80 group-hover:text-[#4cf479] transition-colors truncate">
                {artist.name}
              </span>
              {artist.isVerified && (
                <span className="material-symbols-outlined text-[12px] text-blue-400 font-bold ml-1 flex-shrink-0">
                  verified
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
