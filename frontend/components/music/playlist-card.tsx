'use client';

import * as React from 'react';
import Link from 'next/link';
import { Play, ListMusic } from 'lucide-react';
import { Playlist } from '@/types/playlist';
import { cn } from '@/lib/utils/cn';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';

export interface PlaylistCardProps {
  playlist: Playlist;
  onPlay?: (playlist: Playlist) => void;
  className?: string;
}

export function PlaylistCard({ playlist, onPlay, className }: PlaylistCardProps) {
  const coverSrc = playlist.cover || playlist.coverUrl;
  const ownerName = typeof playlist.owner === 'string'
    ? playlist.owner
    : playlist.owner?.displayName || playlist.owner?.username || 'MUSIFY';

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPlay?.(playlist);
  };

  return (
    <Link
      href={`/playlists/${playlist.id}`}
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
          src={coverSrc}
          alt={playlist.title}
          fallbackIcon={<ListMusic className="h-1/3 w-1/3 stroke-[1.5] text-neutral-600" />}
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
            aria-label={`Play ${playlist.title}`}
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

      {/* Playlist info */}
      <div className="mt-3 min-w-0">
        <h4 className="truncate text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
          {playlist.title}
        </h4>
        <p className="mt-0.5 truncate text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">
          {playlist.description || `By ${ownerName}`}
        </p>
      </div>
    </Link>
  );
}
