'use client';

import * as React from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { Artist } from '@/types/artist';
import { cn } from '@/lib/utils/cn';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';

export interface ArtistCardProps {
  artist: Artist;
  className?: string;
}

export function ArtistCard({ artist, className }: ArtistCardProps) {
  const imageUrl = artist.image;

  return (
    <Link
      href={`/artists/${artist.id}`}
      className={cn(
        'group relative flex flex-col items-center rounded-xl bg-neutral-900/40 p-4 border border-white/5',
        'hover:border-white/10 hover:bg-neutral-850 hover:shadow-xl hover:shadow-black/40',
        'cursor-pointer transition-all duration-300 select-none text-center block',
        className
      )}
    >
      {/* Circular Artist Image */}
      <div className="relative aspect-square w-full max-w-[160px] overflow-hidden rounded-full bg-neutral-800 shadow-md">
        <ImageWithFallback
          src={imageUrl}
          alt={artist.name}
          fallbackIcon={<User className="h-1/2 w-1/2 text-neutral-600" />}
          fill
          sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 15vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Artist info */}
      <div className="mt-3 w-full min-w-0">
        <h4 className="truncate text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
          {artist.name}
        </h4>
        <p className="mt-0.5 text-xs text-neutral-400">
          Artist
        </p>
      </div>
    </Link>
  );
}
