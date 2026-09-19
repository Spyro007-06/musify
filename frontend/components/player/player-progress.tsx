'use client';

import * as React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { formatDuration } from '@/lib/utils/format-duration';
import { cn } from '@/lib/utils/cn';

export interface PlayerProgressProps {
  className?: string;
  showTimes?: boolean;
}

export function PlayerProgress({ className, showTimes = true }: PlayerProgressProps) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);

  // Local drag state for optimistic scrubbing
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragValue, setDragValue] = React.useState(0);

  const displayTime = isDragging ? dragValue : currentTime;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragValue(Number(e.target.value));
  };

  const handleMouseDown = () => {
    setIsDragging(true);
    setDragValue(currentTime);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      seek(dragValue);
      setIsDragging(false);
    }
  };

  const handleTouchStart = () => {
    setIsDragging(true);
    setDragValue(currentTime);
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      seek(dragValue);
      setIsDragging(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seek(Math.max(0, currentTime - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      seek(Math.min(duration, currentTime + 5));
    }
  };

  return (
    <div className={cn('flex items-center gap-2 w-full select-none', className)}>
      {showTimes && (
        <span className="text-[11px] font-medium text-neutral-400 tabular-nums w-9 text-right shrink-0">
          {formatDuration(displayTime)}
        </span>
      )}

      {/* Seekable Track Bar */}
      <div className="relative flex-1 flex items-center group py-1">
        {/* Background track */}
        <div className="h-1 w-full rounded-full bg-neutral-800 group-hover:h-1.5 transition-all overflow-hidden relative">
          <div
            className="h-full bg-white group-hover:bg-brand-500 rounded-full transition-colors"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Real HTML Range Input for accessibility & pointer gestures */}
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 100}
          step={0.1}
          value={displayTime}
          disabled={duration === 0}
          onChange={handleSliderChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onKeyDown={handleKeyDown}
          aria-label="Track playback progress"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(displayTime)}
          aria-valuetext={`${formatDuration(displayTime)} of ${formatDuration(duration)}`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {/* Thumb indicator on hover */}
        <div
          className={cn(
            'absolute h-3 w-3 rounded-full bg-white shadow-md pointer-events-none transition-transform -translate-x-1/2',
            isDragging ? 'scale-100' : 'scale-0 group-hover:scale-100'
          )}
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {showTimes && (
        <span className="text-[11px] font-medium text-neutral-400 tabular-nums w-9 text-left shrink-0">
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}
