'use client';

import * as React from 'react';
import Link from 'next/link';
import { History, Play, Pause, AlertCircle, RefreshCw, Compass } from 'lucide-react';
import { useRecentlyPlayed } from '@/hooks/use-music';
import { usePlayerStore } from '@/stores/player-store';
import { TrackRow } from '@/components/music/track-row';
import { Skeleton } from '@/components/ui/skeleton';
import { Track } from '@/types/track';

export default function RecentlyPlayedPage() {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const {
    data: recentlyPlayed,
    isLoading,
    isError,
    error,
    refetch,
  } = useRecentlyPlayed(1, 50);

  const hasTracks = Boolean(recentlyPlayed && recentlyPlayed.length > 0);

  // Check if active track is from this recently played list
  const isCollectionPlaying =
    isPlaying && currentTrack && recentlyPlayed?.some((t) => t.id === currentTrack.id);

  const handlePlayAll = () => {
    if (!recentlyPlayed || recentlyPlayed.length === 0) return;
    if (isCollectionPlaying) {
      togglePlay();
    } else {
      playTrack(recentlyPlayed[0], recentlyPlayed);
    }
  };

  const handlePlayTrack = (track: Track) => {
    if (!recentlyPlayed) return;
    playTrack(track, recentlyPlayed);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/70 via-teal-950/40 to-black p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 text-center sm:text-left">
          {/* Cover icon badge */}
          <div className="flex aspect-square w-40 sm:w-52 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 shadow-2xl shadow-emerald-950/60 border border-white/10">
            <History className="h-20 w-20 sm:h-24 sm:w-24 stroke-[2.5] text-black drop-shadow-md" />
          </div>

          {/* Details */}
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <span>Listening History</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
              Recently Played
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-neutral-300">
              <span>{recentlyPlayed ? `${recentlyPlayed.length} tracks` : '0 tracks'}</span>
              <span>&bull;</span>
              <span className="text-neutral-400">Streamed from your sessions</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Action Bar */}
      {hasTracks && (
        <div className="flex items-center gap-4 px-1">
          <button
            type="button"
            onClick={handlePlayAll}
            aria-label={isCollectionPlaying ? 'Pause recently played' : 'Play all recently played'}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-black shadow-xl shadow-emerald-950/60 hover:scale-105 active:scale-95 hover:bg-emerald-400 transition-all duration-300"
          >
            {isCollectionPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* 3. Loading Skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`recent-skel-${i}`}
              className="flex items-center justify-between rounded-xl px-3 py-2 bg-neutral-900/30 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 bg-neutral-800 rounded" />
                <Skeleton className="h-10 w-10 bg-neutral-800 rounded-md" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40 bg-neutral-800 rounded" />
                  <Skeleton className="h-3 w-24 bg-neutral-800 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-12 bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* 4. Error State */}
      {isError && (
        <div role="alert" className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-950/10 p-10 text-center">
          <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
          <h3 className="text-base font-semibold text-white">Failed to load recently played tracks</h3>
          <p className="mt-1 text-xs text-neutral-400 max-w-sm">
            {error?.message || 'A network error occurred while retrieving your listening history.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* 5. Empty State */}
      {!isLoading && !isError && !hasTracks && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/80 text-neutral-500 mb-4">
            <History className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-white">No listening history yet</h3>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400 max-w-md">
            Tracks you play will automatically appear here as you listen to music across MUSIFY.
          </p>
          <Link
            href="/discover"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
          >
            <Compass className="h-4 w-4" />
            <span>Start Listening</span>
          </Link>
        </div>
      )}

      {/* 6. Track List */}
      {!isLoading && !isError && recentlyPlayed && recentlyPlayed.length > 0 && (
        <div className="space-y-1">
          {recentlyPlayed.map((track, index) => (
            <TrackRow
              key={`recent-song-${track.id}-${index}`}
              track={track}
              index={index}
              onPlay={handlePlayTrack}
            />
          ))}
        </div>
      )}
    </div>
  );
}
