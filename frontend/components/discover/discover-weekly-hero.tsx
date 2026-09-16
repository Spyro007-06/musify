'use client';

import * as React from 'react';
import Link from 'next/link';
import { Play, Sparkles, Disc3, Music2, LogIn } from 'lucide-react';
import { Track } from '@/types/track';
import { usePlayerStore } from '@/stores/player-store';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/utils/format-duration';
import { cn } from '@/lib/utils/cn';

export interface DiscoverWeeklyHeroProps {
  tracks?: Track[];
  isLoading?: boolean;
  isGuest?: boolean;
  className?: string;
}

export function DiscoverWeeklyHero({
  tracks = [],
  isLoading = false,
  isGuest = false,
  className,
}: DiscoverWeeklyHeroProps) {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const hasTracks = tracks && tracks.length > 0;
  const leadTrack = hasTracks ? tracks[0] : null;
  const totalDuration = React.useMemo(() => {
    return tracks.reduce((acc, t) => acc + (t.duration || t.durationSeconds || 0), 0);
  }, [tracks]);

  const handlePlayAll = () => {
    if (!hasTracks) return;
    playTrack(tracks[0], tracks);
  };

  const handlePlayTrack = (track: Track) => {
    playTrack(track, tracks);
  };

  if (isLoading) {
    return (
      <div className={cn('relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/50 p-6 sm:p-8', className)}>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <Skeleton className="aspect-square w-48 sm:w-56 rounded-2xl bg-neutral-800 shrink-0" />
          <div className="flex-1 space-y-4 w-full">
            <Skeleton className="h-5 w-32 rounded-full bg-neutral-800" />
            <Skeleton className="h-9 w-64 rounded bg-neutral-800" />
            <Skeleton className="h-4 w-full max-w-md rounded bg-neutral-800" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-11 w-32 rounded-full bg-neutral-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Guest Callout
  if (isGuest) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-neutral-900/60 to-black p-6 sm:p-8 shadow-2xl backdrop-blur-xl',
          className
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Personalized Mixtape</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Unlock Your Discover Weekly
            </h2>
            <p className="text-sm text-neutral-400">
              Sign in to get a fresh 30-track mixtape generated from your unique listening preferences, updated regularly.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/login?redirect=/discover"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-black hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-950/50"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/signup?redirect=/discover"
              className="rounded-full bg-white/10 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Hero with real tracks
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/60 via-neutral-900/80 to-black p-6 sm:p-8 shadow-2xl backdrop-blur-xl',
        className
      )}
    >
      {/* Ambient decorative glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        {/* Left: Artwork + Header Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left w-full lg:w-auto">
          {/* Cover */}
          <div className="relative aspect-square w-44 sm:w-52 shrink-0 overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl border border-white/10 group">
            <ImageWithFallback
              src={leadTrack?.artwork}
              alt="Discover Weekly"
              fallbackIcon={<Disc3 className="h-1/2 w-1/2 text-neutral-600 animate-spin-slow" />}
              fill
              sizes="(max-width: 640px) 176px, 208px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-3 left-3 right-3 text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                MUSIFY MIXTAPE
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 max-w-md">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Weekly Discovery</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Discover Weekly
            </h1>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Your personalized mixtape of new sounds, fresh releases, and hidden gems tailored to your taste profile.
            </p>

            {hasTracks && (
              <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-neutral-400 font-medium pt-1">
                <span>{tracks.length} tracks</span>
                <span>•</span>
                <span>{Math.round(totalDuration / 60)} mins</span>
              </div>
            )}

            {/* Play All button */}
            {hasTracks && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePlayAll}
                  aria-label="Play Discover Weekly"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-black hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-950/60"
                >
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                  <span>Play All</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Preview Rows of first 3 tracks */}
        {hasTracks ? (
          <div className="w-full lg:w-80 rounded-2xl bg-neutral-900/60 p-3.5 border border-white/5 space-y-2 backdrop-blur-md">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Preview
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">Top picks</span>
            </div>

            <div className="space-y-1">
              {tracks.slice(0, 3).map((track, idx) => {
                const isThisTrackPlaying = currentTrack?.id === track.id && isPlaying;

                return (
                  <div
                    key={`hero-track-${track.id}-${idx}`}
                    onClick={() => handlePlayTrack(track)}
                    className="group flex items-center justify-between rounded-xl p-2 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                        <ImageWithFallback
                          src={track.artwork}
                          alt={track.title}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <p
                          className={cn(
                            'truncate text-xs font-semibold transition-colors',
                            isThisTrackPlaying ? 'text-emerald-400' : 'text-white group-hover:text-emerald-400'
                          )}
                        >
                          {track.title}
                        </p>
                        <p className="truncate text-[11px] text-neutral-400">
                          {track.artists?.map((a) => a.name).join(', ') || 'Artist'}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] text-neutral-500 tabular-nums shrink-0 ml-2">
                      {formatDuration(track.duration || track.durationSeconds || 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 p-8 text-center w-full lg:w-80">
            <Music2 className="h-8 w-8 text-neutral-600 mb-2" />
            <p className="text-sm font-semibold text-white">We’re still learning your taste</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs">
              Play a few tracks from Home or Search to help generate your Discover Weekly mixtape.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
