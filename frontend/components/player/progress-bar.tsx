'use client';

import * as React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { formatDuration } from '@/lib/utils/format-duration';
import { cn } from '@/lib/utils/cn';

export function ProgressBar({ className }: { className?: string }) {
  const { progress, duration, seek } = usePlayerStore();

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  return (
    <div className={cn('flex items-center gap-2 w-full text-xs text-neutral-400', className)}>
      <span>{formatDuration(progress)}</span>
      <input
        type="range"
        min={0}
        max={duration || 100}
        value={progress}
        onChange={handleSeek}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-neutral-800 accent-white"
      />
      <span>{formatDuration(duration)}</span>
    </div>
  );
}
