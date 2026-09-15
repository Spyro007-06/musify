import * as React from 'react';
import Link from 'next/link';
import { Artist } from '@/types/artist';
import { cn } from '@/lib/utils/cn';

export interface ArtistCardProps {
  artist: Artist;
  className?: string;
}

export function ArtistCard({ artist, className }: ArtistCardProps) {
  return (
    <Link
      href={`/artists/${artist.id}`}
      className={cn(
        'group block rounded-lg bg-neutral-900/60 p-3 hover:bg-neutral-800 transition-colors text-center',
        className
      )}
    >
      <div className="relative aspect-square w-full rounded-full bg-neutral-800 overflow-hidden mx-auto" />
      <h4 className="mt-3 truncate text-sm font-medium text-white">{artist.name}</h4>
      <p className="text-xs text-neutral-400">Artist</p>
    </Link>
  );
}
