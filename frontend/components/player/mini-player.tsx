'use client';

import * as React from 'react';
import { Maximize2, ListMusic, Heart, Disc3, Play, Pause, Loader2, Download } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { PlayerControls } from './player-controls';
import { PlayerProgress } from './player-progress';
import { PlayerVolume } from './player-volume';
import { useLikeTrack } from '@/hooks/use-music';
import { useDownloadTrack } from '@/hooks/use-download-track';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';

export function MiniPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const error = usePlayerStore((s) => s.error);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const queue = usePlayerStore((s) => s.queue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const openExpanded = usePlayerStore((s) => s.openExpanded);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const setError = usePlayerStore((s) => s.setError);

  const [isLiked, setIsLiked] = React.useState(Boolean(currentTrack?.isLiked));
  const likeMutation = useLikeTrack();
  const downloadTrack = useDownloadTrack();

  React.useEffect(() => {
    setIsLiked(Boolean(currentTrack?.isLiked));
  }, [currentTrack]);

  // Route playback failures through the shared toast stack instead of a
  // bespoke floating banner — gets auto-dismiss and stacking for free, and
  // can't get stuck on screen if the store's error is never cleared.
  React.useEffect(() => {
    if (!error) return;
    toast.error(error);
    setError(null);
  }, [error, setError]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack || likeMutation.isPending) return;
    const nextState = !isLiked;
    setIsLiked(nextState);
    likeMutation.mutate({ trackId: currentTrack.id, isLiked: !nextState });
  };

  const artwork = currentTrack?.artwork;
  const artists = currentTrack?.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <>
      {/* 1. Mobile Mini Player (< md screen) */}
      {currentTrack && (
        <div
          className={cn(
            'fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 md:hidden',
            'h-14 bg-neutral-900/95 border-t border-white/10 px-3 flex items-center justify-between backdrop-blur-md shadow-lg shadow-black/50'
          )}
        >
        {/* Mobile top thin progress indicator — a bare bar, not the full
            PlayerProgress (its thumb + hit-area need more than 4px of
            height and were getting clipped to invisible here). Tapping
            the row already opens the expanded player's full seek bar. */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-700/80">
          <div
            className="h-full bg-brand-500 transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
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
                'flex h-11 w-11 items-center justify-center rounded-full text-neutral-400 hover:text-white',
                isLiked && 'text-brand-400'
              )}
            >
              <Heart className={cn('h-5 w-5', isLiked && 'fill-current')} />
            </button>
          )}

          <button
            type="button"
            onClick={togglePlay}
            disabled={!currentTrack && !isLoading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-black" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>
        </div>
      </div>
      )}

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
                  isLiked && 'text-brand-400 hover:text-brand-300'
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
          {/* Download Button */}
          <button
            type="button"
            onClick={() => currentTrack && downloadTrack(currentTrack)}
            disabled={!currentTrack}
            aria-label="Download current track"
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
          >
            <Download className="h-4 w-4" />
          </button>

          {/* Queue Button */}
          <button
            type="button"
            onClick={toggleQueue}
            aria-label="Toggle Play Queue"
            aria-expanded={isQueueOpen}
            className={cn(
              'relative flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500',
              isQueueOpen
                ? 'text-brand-400 bg-brand-500/10'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            )}
          >
            <ListMusic className="h-4 w-4" />
            {queue.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-black">
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
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
