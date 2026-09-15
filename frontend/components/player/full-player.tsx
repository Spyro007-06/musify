'use client';

import * as React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { PlayerControls } from './player-controls';
import { ProgressBar } from './progress-bar';
import { VolumeControl } from './volume-control';

export function FullPlayer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentTrack } = usePlayerStore();

  if (!isOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black p-8">
      <div className="flex justify-between items-center">
        <button onClick={onClose} className="text-sm text-neutral-400 hover:text-white">
          Close
        </button>
        <span className="text-xs uppercase tracking-widest text-neutral-500">Now Playing</span>
        <div className="w-10" />
      </div>

      <div className="mx-auto flex flex-col items-center">
        <div className="h-64 w-64 rounded-xl bg-neutral-800 shadow-2xl" />
        <h2 className="mt-6 text-2xl font-bold text-white">{currentTrack.title}</h2>
        <p className="mt-1 text-sm text-neutral-400">
          {currentTrack.artists?.map((a) => a.name).join(', ')}
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
        <ProgressBar />
        <PlayerControls />
        <VolumeControl />
      </div>
    </div>
  );
}
