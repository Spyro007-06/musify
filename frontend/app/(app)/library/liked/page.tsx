'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart, Play, Pause, AlertCircle, RefreshCw, Music2, Sparkles } from 'lucide-react';
import { useLikedSongs } from '@/hooks/use-music';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';
import { TrackRow } from '@/components/music/track-row';
import { Skeleton } from '@/components/ui/skeleton';
import { Track } from '@/types/track';

export default function LikedSongsPage() {
  const user = useAuthStore((s) => s.user);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const {
    data: likedSongs,
    isLoading,
    isError,
    error,
    refetch,
  } = useLikedSongs(1, 100);

  const hasTracks = Boolean(likedSongs && likedSongs.length > 0);

  // Check if any track from this liked songs collection is currently playing
  const isCollectionPlaying =
    isPlaying && currentTrack && likedSongs?.some((t) => t.id === currentTrack.id);

  // Calculate total duration
  const totalDurationSeconds = React.useMemo(() => {
    if (!likedSongs) return 0;
    return likedSongs.reduce(
      (acc, t) =>
        acc + (t.duration ?? t.durationSeconds ?? (t.durationMs ? t.durationMs / 1000 : 0)),
      0
    );
  }, [likedSongs]);

  const formattedTotalTime = React.useMemo(() => {
    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  }, [totalDurationSeconds]);

  const handlePlayAll = () => {
    if (!likedSongs || likedSongs.length === 0) return;
    if (isCollectionPlaying) {
      togglePlay();
    } else {
      playTrack(likedSongs[0], likedSongs);
    }
  };

  const handlePlayTrack = (track: Track) => {
    if (!likedSongs) return;
    playTrack(track, likedSongs);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Liked Songs Header Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-indigo-950/70 via-purple-950/40 to-black p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-purple-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 text-center sm:text-left">
          {/* Heart Cover artwork */}
          <div className="flex aspect-square w-40 sm:w-52 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-emerald-500 shadow-2xl shadow-purple-950/60 border border-white/10">
            <Heart className="h-20 w-20 sm:h-24 sm:w-24 fill-white text-white drop-shadow-md" />
          </div>

          {/* Details */}
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Playlist</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
              Liked Songs
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-neutral-300">
              <span className="font-semibold text-white">
                {user?.displayName || user?.username || 'You'}
              </span>
              <span>&bull;</span>
              <span>{likedSongs ? `${likedSongs.length} songs` : '0 songs'}</span>
              {hasTracks && (
                <>
                  <span>&bull;</span>
                  <span className="text-neutral-400">{formattedTotalTime}</span>
                </>
              )}
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
            aria-label={isCollectionPlaying ? 'Pause liked songs' : 'Play all liked songs'}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500 text-white shadow-xl shadow-purple-950/60 hover:scale-105 active:scale-95 hover:bg-purple-400 transition-all duration-300"
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
              key={`liked-skel-${i}`}
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-950/10 p-10 text-center">
          <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
          <h3 className="text-base font-semibold text-white">Failed to load liked songs</h3>
          <p className="mt-1 text-xs text-neutral-400 max-w-sm">
            {error?.message || 'A network error occurred while retrieving your liked tracks.'}
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
            <Heart className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-white">Songs you like will appear here</h3>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400 max-w-md">
            Save songs you love by tapping the heart icon on any track row, card, or player across MUSIFY.
          </p>
          <Link
            href="/discover"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
          >
            <Music2 className="h-4 w-4" />
            <span>Discover Music</span>
          </Link>
        </div>
      )}

      {/* 6. Track List */}
      {!isLoading && !isError && likedSongs && likedSongs.length > 0 && (
        <div className="space-y-1">
          {likedSongs.map((track, index) => (
            <TrackRow
              key={`liked-song-${track.id}-${index}`}
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
