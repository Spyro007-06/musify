import * as React from 'react';
import { Track } from '@/types/track';
import { cn } from '@/lib/utils/cn';

export interface TrackCardProps {
  track: Track;
  onPlay?: (track: Track) => void;
  className?: string;
}

export function TrackCard({ track, onPlay, className }: TrackCardProps) {
  return (
    <div
      onClick={() => onPlay?.(track)}
      className={cn(
        'group cursor-pointer rounded-lg bg-neutral-900/60 p-3 hover:bg-neutral-800 transition-colors',
        className
      )}
    >
      <div className="relative aspect-square w-full rounded-md bg-neutral-800 overflow-hidden" />
      <h4 className="mt-2 truncate text-sm font-medium text-white">{track.title}</h4>
      <p className="truncate text-xs text-neutral-400">
        {track.artists?.map((a) => a.name).join(', ')}
      </p>
    </div>
  );
}
