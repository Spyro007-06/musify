"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Artist } from "@/types/music";

interface ArtistCardProps {
  artist: Artist;
}

export const ArtistCard = memo(function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link href={`/artist/${artist.id}`} className="flex-shrink-0 group cursor-pointer w-40 text-center block">
      <div className="relative rounded-full overflow-hidden aspect-square glass-card mb-4 group-hover:scale-[1.04] transition-all duration-300 mx-auto w-36 h-36">
        {artist.image ? (
          <Image
            src={artist.image}
            alt={artist.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 144px, 256px"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-white/20">person</span>
          </div>
        )}
      </div>
      <h3 className="font-semibold text-sm text-white/80 group-hover:text-white transition-colors truncate">
        {artist.name}
      </h3>
      {artist.isVerified && (
        <span className="text-[10px] bg-[#4cf479]/10 text-[#4cf479] border border-[#4cf479]/20 px-2 py-0.5 rounded-full mt-1.5 inline-block">
          Verified
        </span>
      )}
    </Link>
  );
});
