import * as React from 'react';
import Link from 'next/link';
import { Album } from '@/types/album';
import { cn } from '@/lib/utils/cn';

export interface AlbumCardProps {
  album: Album;
  className?: string;
}

export function AlbumCard({ album, className }: AlbumCardProps) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className={cn(
        'group block rounded-lg bg-neutral-900/60 p-3 hover:bg-neutral-800 transition-colors',
        className
      )}
    >
      <div className="relative aspect-square w-full rounded-md bg-neutral-800 overflow-hidden" />
      <h4 className="mt-2 truncate text-sm font-medium text-white">{album.title}</h4>
      <p className="truncate text-xs text-neutral-400">
        {album.artists?.map((a) => a.name).join(', ')}
      </p>
    </Link>
  );
}
