'use client';

import * as React from 'react';
import { useAudio } from '@/hooks/use-audio';
import { MiniPlayer } from './mini-player';
import { ExpandedPlayer } from './expanded-player';
import { QueuePanel } from './queue-panel';

export function GlobalPlayer() {
  // Mount authoritative AudioEngine listener bridge
  useAudio();

  return (
    <>
      <MiniPlayer />
      <ExpandedPlayer />
      <QueuePanel />
    </>
  );
}
