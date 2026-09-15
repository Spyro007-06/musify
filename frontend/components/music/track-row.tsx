import * as React from 'react';
import { Track } from '@/types/track';
import { formatDuration } from '@/lib/utils/format-duration';
import { cn } from '@/lib/utils/cn';

export interface TrackRowProps {
  track: Track;
  index?: number;
  onPlay?: (track: Track) => void;
  className?: string;
}

export function TrackRow({ track, index, onPlay, className }: TrackRowProps) {
  return (
    <div
      onClick={() => onPlay?.(track)}
      className={cn(
        'group flex items-center justify-between rounded-md p-2 text-sm hover:bg-neutral-800/60 cursor-pointer transition-colors',
        className
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {typeof index === 'number' && (
          <span className="w-5 text-center text-xs text-neutral-500">{index + 1}</span>
        )}
        <div className="h-10 w-10 shrink-0 rounded bg-neutral-800" />
        <div className="overflow-hidden">
          <p className="truncate font-medium text-white">{track.title}</p>
          <p className="truncate text-xs text-neutral-400">
            {track.artists?.map((a) => a.name).join(', ')}
          </p>
        </div>
      </div>
      <span className="text-xs text-neutral-500">{formatDuration(track.duration ?? (track.durationMs ? track.durationMs / 1000 : 0))}</span>
    </div>
  );
}
