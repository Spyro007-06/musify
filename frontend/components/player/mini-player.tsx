'use client';

import * as React from 'react';
import { Maximize2, ListMusic, Heart, Disc3, Play, Pause, Loader2, AlertCircle } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { PlayerControls } from './player-controls';
import { PlayerProgress } from './player-progress';
import { PlayerVolume } from './player-volume';
import { useLikeTrack } from '@/hooks/use-music';
import { cn } from '@/lib/utils/cn';

export function MiniPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const error = usePlayerStore((s) => s.error);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const queue = usePlayerStore((s) => s.queue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const openExpanded = usePlayerStore((s) => s.openExpanded);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const setError = usePlayerStore((s) => s.setError);

  const [isLiked, setIsLiked] = React.useState(Boolean(currentTrack?.isLiked));
  const likeMutation = useLikeTrack();

  React.useEffect(() => {
    setIsLiked(Boolean(currentTrack?.isLiked));
  }, [currentTrack]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    likeMutation.mutate({ trackId: currentTrack.id, isLiked: !nextState });
  };

  const artwork = currentTrack?.artwork || currentTrack?.artworkUrl;
  const artists = currentTrack?.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';

  return (
    <>
      {/* Playback Error Toast if stream fails */}
      {error && (
        <div
          role="alert"
          className="fixed bottom-28 md:bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-neutral-900/95 px-4 py-2.5 text-xs text-rose-300 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2"
        >
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 rounded p-0.5 text-neutral-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. Mobile Mini Player (< md screen) */}
      <div
        className={cn(
          'fixed bottom-14 left-0 right-0 z-30 md:hidden',
          'h-14 bg-neutral-900/95 border-t border-white/10 px-3 flex items-center justify-between backdrop-blur-md'
        )}
      >
        {/* Mobile top thin progress indicator */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-neutral-800 overflow-hidden">
          <PlayerProgress showTimes={false} className="!py-0" />
        </div>

        {/* Track info (Click opens expanded player) */}
        <div
          onClick={openExpanded}
          className="flex items-center gap-2.5 flex-1 min-w-0 pr-2 cursor-pointer"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-800 shadow-sm">
            <ImageWithFallback
              src={artwork}
              alt={currentTrack?.title || 'No track'}
              fallbackIcon={<Disc3 className="h-5 w-5 text-neutral-600" />}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>

          <div className="overflow-hidden">
            <p className="truncate text-xs font-semibold text-white">
              {currentTrack?.title || 'MUSIFY Player'}
            </p>
            <p className="truncate text-[11px] text-neutral-400">
              {currentTrack ? artists : 'Select a track to play'}
            </p>
          </div>
        </div>

        {/* Mobile Actions: Like + Play/Pause */}
        <div className="flex items-center gap-1 shrink-0">
          {currentTrack && (
            <button
              type="button"
              onClick={handleLike}
              aria-label={isLiked ? 'Unlike' : 'Like'}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:text-white',
                isLiked && 'text-emerald-400'
              )}
            >
              <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
            </button>
          )}

          <button
            type="button"
            onClick={togglePlay}
            disabled={!currentTrack && !isLoading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-black" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Desktop Mini Player (>= md screen) */}
      <div
        role="region"
        aria-label="Audio Player"
        className="hidden md:flex h-20 w-full shrink-0 border-t border-neutral-800/80 bg-neutral-950/95 px-4 lg:px-6 items-center justify-between select-none z-30"
      >
        {/* Left column: Track Info & Like Button */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[200px] max-w-xs">
          {currentTrack ? (
            <>
              <div
                onClick={openExpanded}
                className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-900 shadow-md cursor-pointer border border-white/5"
              >
                <ImageWithFallback
                  src={artwork}
                  alt={currentTrack.title}
                  fallbackIcon={<Disc3 className="h-6 w-6 text-neutral-600" />}
                  fill
                  sizes="48px"
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="overflow-hidden pr-1">
                <p
                  onClick={openExpanded}
                  className="truncate text-sm font-semibold text-white hover:underline cursor-pointer"
                >
                  {currentTrack.title}
                </p>
                <p className="truncate text-xs text-neutral-400 hover:text-neutral-300">
                  {artists}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLike}
                aria-label={isLiked ? 'Unlike' : 'Like'}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors',
                  isLiked && 'text-emerald-400 hover:text-emerald-300'
                )}
              >
                <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 text-neutral-500">
              <div className="h-12 w-12 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                <Disc3 className="h-6 w-6 text-neutral-700" />
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-400">MUSIFY Player</p>
                <p className="text-[11px] text-neutral-600">Choose a track to play</p>
              </div>
            </div>
          )}
        </div>

        {/* Center column: Player Controls & Seekable Progress Bar */}
        <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl px-4">
          <PlayerControls size="md" />
          <PlayerProgress className="max-w-md" />
        </div>

        {/* Right column: Queue Toggle, Volume Slider, Expand Button */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px] max-w-xs">
          {/* Queue Button */}
          <button
            type="button"
            onClick={toggleQueue}
            aria-label="Toggle Play Queue"
            aria-expanded={isQueueOpen}
            className={cn(
              'relative flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500',
              isQueueOpen
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            )}
          >
            <ListMusic className="h-4 w-4" />
            {queue.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-black">
                {queue.length > 99 ? '99+' : queue.length}
              </span>
            )}
          </button>

          {/* Volume Control */}
          <PlayerVolume />

          {/* Expand Fullscreen Button */}
          <button
            type="button"
            onClick={openExpanded}
            disabled={!currentTrack}
            aria-label="Expand Player View"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
