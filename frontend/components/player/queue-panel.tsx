'use client';

import * as React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils/cn';

export function QueuePanel({ className }: { className?: string }) {
  const { queue, currentIndex } = usePlayerStore();

  return (
    <div className={cn('p-4 bg-neutral-900 border-l border-neutral-800 text-white', className)}>
      <h3 className="font-semibold text-lg mb-4">Queue</h3>
      <div className="space-y-2">
        {queue.map((track, i) => (
          <div
            key={`${track.id}-${i}`}
            className={cn(
              'p-2 rounded flex items-center justify-between text-sm',
              i === currentIndex ? 'bg-neutral-800 font-bold text-white' : 'text-neutral-400'
            )}
          >
            <span>{track.title}</span>
            <span className="text-xs text-neutral-500">{track.artists?.map((a) => a.name).join(', ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
