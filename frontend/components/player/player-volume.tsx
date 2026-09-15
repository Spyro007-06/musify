'use client';

import * as React from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils/cn';

export interface PlayerVolumeProps {
  className?: string;
  sliderWidth?: string;
}

export function PlayerVolume({ className, sliderWidth = 'w-24' }: PlayerVolumeProps) {
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  const effectiveVolume = isMuted ? 0 : volume;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      setVolume(Math.min(1, volume + 0.05));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setVolume(Math.max(0, volume - 0.05));
    }
  };

  const VolumeIcon = effectiveVolume === 0 ? VolumeX : effectiveVolume < 0.5 ? Volume1 : Volume2;
  const volumePercent = Math.round(effectiveVolume * 100);

  return (
    <div className={cn('flex items-center gap-2 group select-none', className)}>
      {/* Mute / Unmute Button */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
      >
        <VolumeIcon className="h-4 w-4" />
      </button>

      {/* Volume Slider */}
      <div className={cn('relative flex items-center py-1', sliderWidth)}>
        {/* Track bar */}
        <div className="h-1 w-full rounded-full bg-neutral-800 group-hover:h-1.5 transition-all overflow-hidden relative">
          <div
            className="h-full bg-white group-hover:bg-emerald-500 rounded-full transition-colors"
            style={{ width: `${volumePercent}%` }}
          />
        </div>

        {/* Range input */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={effectiveVolume}
          onChange={handleVolumeChange}
          onKeyDown={handleKeyDown}
          aria-label="Volume level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={volumePercent}
          aria-valuetext={`${volumePercent}%`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* Thumb indicator on hover */}
        <div
          className="absolute h-3 w-3 rounded-full bg-white shadow-md pointer-events-none scale-0 group-hover:scale-100 transition-transform -translate-x-1/2"
          style={{ left: `${volumePercent}%` }}
        />
      </div>
    </div>
  );
}
