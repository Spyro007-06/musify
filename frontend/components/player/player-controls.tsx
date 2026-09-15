'use client';

import * as React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils/cn';

export function PlayerControls({ className }: { className?: string }) {
  const { isPlaying, togglePlay, nextTrack, previousTrack, shuffle, toggleShuffle, repeat, cycleRepeat } =
    usePlayerStore();

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <button
        onClick={toggleShuffle}
        className={cn('text-xs', shuffle ? 'text-white' : 'text-neutral-500 hover:text-white')}
      >
        Shuffle
      </button>
      <button onClick={previousTrack} className="text-xs text-neutral-400 hover:text-white">
        Prev
      </button>
      <button
        onClick={togglePlay}
        className="h-8 w-8 rounded-full bg-white text-xs font-bold text-black flex items-center justify-center"
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button onClick={nextTrack} className="text-xs text-neutral-400 hover:text-white">
        Next
      </button>
      <button
        onClick={cycleRepeat}
        className={cn('text-xs', repeat !== 'off' ? 'text-white' : 'text-neutral-500 hover:text-white')}
      >
        Repeat ({repeat})
      </button>
    </div>
  );
}
