'use client';

import * as React from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Loader2 } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils/cn';

export interface PlayerControlsProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PlayerControls({ size = 'md', className }: PlayerControlsProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);

  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const previousTrack = usePlayerStore((s) => s.previousTrack);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const hasTrack = !!currentTrack || queue.length > 0;

  // Sizes setup
  const playBtnSizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-14 w-14',
  };

  const playIconSizes = {
    sm: 'h-4 w-4 ml-0.5',
    md: 'h-4 w-4 ml-0.5',
    lg: 'h-6 w-6 ml-0.5',
  };

  const skipIconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  };

  const secondaryIconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={cn('flex items-center gap-2 sm:gap-4 select-none', className)}>
      {/* Shuffle Button */}
      <button
        type="button"
        onClick={toggleShuffle}
        aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
        className={cn(
          'flex items-center justify-center rounded-full p-1.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500',
          shuffle
            ? 'text-emerald-400 hover:text-emerald-300'
            : 'text-neutral-400 hover:text-white'
        )}
      >
        <Shuffle className={secondaryIconSizes[size]} />
      </button>

      {/* Previous Track Button */}
      <button
        type="button"
        onClick={() => previousTrack()}
        disabled={!hasTrack}
        aria-label="Previous track"
        className="flex items-center justify-center rounded-full p-1.5 text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-300 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
      >
        <SkipBack className={skipIconSizes[size]} />
      </button>

      {/* Primary Play / Pause / Spinner Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!hasTrack && !isLoading}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className={cn(
          'flex items-center justify-center rounded-full bg-white text-black shadow-lg shadow-black/30',
          'hover:scale-105 active:scale-95 transition-all duration-200',
          'disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          playBtnSizes[size]
        )}
      >
        {isLoading ? (
          <Loader2 className={cn('animate-spin text-black', playIconSizes[size])} />
        ) : isPlaying ? (
          <Pause className={cn('fill-current', playIconSizes[size])} />
        ) : (
          <Play className={cn('fill-current', playIconSizes[size])} />
        )}
      </button>

      {/* Next Track Button */}
      <button
        type="button"
        onClick={() => nextTrack()}
        disabled={!hasTrack}
        aria-label="Next track"
        className="flex items-center justify-center rounded-full p-1.5 text-neutral-300 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-300 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
      >
        <SkipForward className={skipIconSizes[size]} />
      </button>

      {/* Repeat Button */}
      <button
        type="button"
        onClick={cycleRepeat}
        aria-label={`Repeat mode: ${repeat}`}
        className={cn(
          'flex items-center justify-center rounded-full p-1.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 relative',
          repeat !== 'off'
            ? 'text-emerald-400 hover:text-emerald-300'
            : 'text-neutral-400 hover:text-white'
        )}
      >
        {repeat === 'one' ? (
          <Repeat1 className={secondaryIconSizes[size]} />
        ) : (
          <Repeat className={secondaryIconSizes[size]} />
        )}
        {repeat === 'all' && (
          <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-emerald-400" />
        )}
      </button>
    </div>
  );
}
