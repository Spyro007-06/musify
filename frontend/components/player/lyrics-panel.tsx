'use client';

import * as React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils/cn';

export function LyricsPanel({ className }: { className?: string }) {
  const { currentTrack } = usePlayerStore();

  return (
    <div className={cn('p-6 bg-neutral-900 border-l border-neutral-800 text-white', className)}>
      <h3 className="font-semibold text-lg mb-4">Lyrics</h3>
      {currentTrack ? (
        <div className="space-y-4 text-neutral-300">
          <p className="text-sm italic">Lyrics synced with playback will appear here.</p>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Play a song to see lyrics</p>
      )}
    </div>
  );
}
