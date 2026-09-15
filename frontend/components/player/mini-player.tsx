'use client';

import * as React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { PlayerControls } from './player-controls';
import { ProgressBar } from './progress-bar';
import { VolumeControl } from './volume-control';
import { cn } from '@/lib/utils/cn';

export function MiniPlayer({ className }: { className?: string }) {
  const { currentTrack } = usePlayerStore();

  if (!currentTrack) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-800 bg-neutral-950 px-4 py-3 flex items-center justify-between',
        className
      )}
    >
      <div className="flex items-center gap-3 w-1/4">
        <div className="h-12 w-12 rounded bg-neutral-800" />
        <div className="overflow-hidden">
          <p className="truncate text-sm font-medium text-white">{currentTrack.title}</p>
          <p className="truncate text-xs text-neutral-400">
            {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown'}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 w-2/4 max-w-xl">
        <PlayerControls />
        <ProgressBar />
      </div>

      <div className="flex items-center justify-end gap-3 w-1/4">
        <VolumeControl />
      </div>
    </div>
  );
}
