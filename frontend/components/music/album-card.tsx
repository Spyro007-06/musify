'use client';

import * as React from 'react';
import Link from 'next/link';
import { Play, Disc3 } from 'lucide-react';
import { Album } from '@/types/album';
import { cn } from '@/lib/utils/cn';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';

export interface AlbumCardProps {
  album: Album;
  onPlay?: (album: Album) => void;
  className?: string;
}

export function AlbumCard({ album, onPlay, className }: AlbumCardProps) {
  const artwork = album.artwork || album.artworkUrl;
  const artistName = album.artist?.name || album.artists?.[0]?.name || 'Various Artists';

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPlay?.(album);
  };

  return (
    <Link
      href={`/albums/${album.id}`}
      className={cn(
        'group relative flex flex-col rounded-xl bg-neutral-900/40 p-3 border border-white/5',
        'hover:border-white/10 hover:bg-neutral-850 hover:shadow-xl hover:shadow-black/40',
        'cursor-pointer transition-all duration-300 select-none block',
        className
      )}
    >
      {/* Cover container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-800 shadow-md">
        <ImageWithFallback
          src={artwork}
          alt={album.title}
          fallbackIcon={<Disc3 className="h-1/3 w-1/3 stroke-[1.5] text-neutral-600 animate-spin-slow" />}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Floating Play Button */}
        {onPlay && (
          <button
            type="button"
            onClick={handlePlay}
            aria-label={`Play ${album.title}`}
            className={cn(
              'absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full',
              'bg-emerald-500 text-black shadow-lg shadow-emerald-950/60',
              'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0',
              'hover:scale-105 active:scale-95 transition-all duration-300 z-10'
            )}
          >
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </button>
        )}
      </div>

      {/* Album info */}
      <div className="mt-3 min-w-0">
        <h4 className="truncate text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
          {album.title}
        </h4>
        <p className="mt-0.5 truncate text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">
          {album.releaseYear ? `${album.releaseYear} • ${artistName}` : artistName}
        </p>
      </div>
    </Link>
  );
}
