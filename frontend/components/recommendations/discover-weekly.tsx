import * as React from 'react';
import { Track } from '@/types/track';
import { TrackRow } from '@/components/music/track-row';
import { cn } from '@/lib/utils/cn';

export interface DiscoverWeeklyProps {
  tracks: Track[];
  className?: string;
}

export function DiscoverWeekly({ tracks, className }: DiscoverWeeklyProps) {
  return (
    <div className={cn('rounded-xl border border-neutral-800 bg-neutral-900/40 p-6', className)}>
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">Discover Weekly</h3>
        <p className="text-xs text-neutral-400">Your weekly mixtape of fresh music.</p>
      </div>
      <div className="space-y-1">
        {tracks.map((track, i) => (
          <TrackRow key={track.id} track={track} index={i} />
        ))}
      </div>
    </div>
  );
}
