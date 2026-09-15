import * as React from 'react';
import Link from 'next/link';
import { Playlist } from '@/types/playlist';
import { cn } from '@/lib/utils/cn';

export interface PlaylistCardProps {
  playlist: Playlist;
  className?: string;
}

export function PlaylistCard({ playlist, className }: PlaylistCardProps) {
  return (
    <Link
      href={`/playlists/${playlist.id}`}
      className={cn(
        'group block rounded-lg bg-neutral-900/60 p-3 hover:bg-neutral-800 transition-colors',
        className
      )}
    >
      <div className="relative aspect-square w-full rounded-md bg-neutral-800 overflow-hidden" />
      <h4 className="mt-2 truncate text-sm font-medium text-white">{playlist.title}</h4>
      <p className="truncate text-xs text-neutral-400">
        {playlist.description || `By ${playlist.owner?.displayName || playlist.owner?.username || 'User'}`}
      </p>
    </Link>
  );
}
