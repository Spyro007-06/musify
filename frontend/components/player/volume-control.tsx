'use client';

import * as React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils/cn';

export function VolumeControl({ className }: { className?: string }) {
  const { volume, isMuted, setVolume, toggleMute } = usePlayerStore();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button onClick={toggleMute} className="text-xs text-neutral-400 hover:text-white">
        {isMuted ? 'Muted' : 'Vol'}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={isMuted ? 0 : volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="h-1 w-20 cursor-pointer appearance-none rounded-lg bg-neutral-800 accent-white"
      />
    </div>
  );
}
