'use client';

import * as React from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { useLyrics } from '@/hooks/use-music';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

// A line lights up slightly early so the highlight doesn't trail the singer.
const LEAD_SECONDS = 0.3;
// After the user scrolls the lyrics themselves, leave the view alone for a bit.
const MANUAL_SCROLL_HOLD_MS = 4000;

/**
 * Lyrics for the current song. Time-synced lyrics follow playback (the
 * current line is highlighted and kept centred) and tapping a line jumps
 * there; plain lyrics are just shown.
 */
export function LyricsPanel({ className }: { className?: string }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const seek = usePlayerStore((s) => s.seek);
  const { data: lyrics, isLoading, isError, refetch } = useLyrics(currentTrack?.id);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const lineRefs = React.useRef<(HTMLElement | null)[]>([]);
  const manualScrollAt = React.useRef(0);

  const lines = lyrics?.lines ?? [];
  const synced = Boolean(lyrics?.synced);
  let active = -1;
  if (synced) {
    for (let i = 0; i < lines.length && (lines[i].time ?? Infinity) <= currentTime + LEAD_SECONDS; i++) active = i;
  }

  React.useEffect(() => {
    const container = containerRef.current;
    const line = lineRefs.current[active];
    if (!container || !line || Date.now() - manualScrollAt.current < MANUAL_SCROLL_HOLD_MS) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({
      top: line.offsetTop - container.clientHeight / 2 + line.offsetHeight / 2,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [active]);

  // A new song starts at the top.
  React.useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 });
    manualScrollAt.current = 0;
  }, [currentTrack?.id]);

  const markManualScroll = () => {
    manualScrollAt.current = Date.now();
  };

  let body: React.ReactNode;
  if (!currentTrack) {
    body = <p className="text-sm text-neutral-400">Play a song to see its lyrics.</p>;
  } else if (isLoading) {
    body = (
      <div className="space-y-3" aria-label="Loading lyrics">
        {[80, 65, 90, 55, 75].map((w) => (
          <Skeleton key={w} className="h-6 rounded bg-white/10" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  } else if (isError) {
    body = (
      <p className="text-sm text-neutral-400">
        Couldn&rsquo;t load the lyrics.{' '}
        <button type="button" onClick={() => refetch()} className="font-semibold text-white underline underline-offset-2">
          Try again
        </button>
      </p>
    );
  } else if (lines.length === 0) {
    body = (
      <p className="text-sm text-neutral-400">
        {lyrics?.instrumental ? 'This one is instrumental. Enjoy the music.' : 'No lyrics for this song yet.'}
      </p>
    );
  } else if (synced) {
    body = lines.map((line, i) => (
      <button
        key={i}
        type="button"
        ref={(el) => {
          lineRefs.current[i] = el;
        }}
        onClick={() => line.time !== null && seek(line.time)}
        aria-current={i === active ? 'true' : undefined}
        className={cn(
          'block w-full py-1.5 text-left text-xl font-bold leading-snug transition-colors duration-300 sm:text-2xl',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded',
          i === active ? 'text-white' : i < active ? 'text-white/40 hover:text-white/70' : 'text-white/55 hover:text-white/80'
        )}
      >
        {line.text || '♪'}
      </button>
    ));
  } else {
    body = (
      <>
        {lines.map((line, i) => (
          <p key={i} className="min-h-[1.5em] py-0.5 text-lg font-semibold leading-snug text-white/85">
            {line.text}
          </p>
        ))}
        <p className="mt-6 text-xs text-neutral-500">These lyrics aren&rsquo;t synced to the song.</p>
      </>
    );
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Lyrics"
      onWheel={markManualScroll}
      onTouchMove={markManualScroll}
      className={cn('relative overflow-y-auto overscroll-contain', className)}
    >
      {body}
    </div>
  );
}
