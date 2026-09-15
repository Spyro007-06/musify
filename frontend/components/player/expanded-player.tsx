'use client';

import * as React from 'react';
import { ChevronDown, ListMusic, Heart, Disc3 } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { PlayerProgress } from './player-progress';
import { PlayerControls } from './player-controls';
import { PlayerVolume } from './player-volume';
import { useLikeTrack } from '@/hooks/use-music';
import { cn } from '@/lib/utils/cn';

export function ExpandedPlayer() {
  const isExpanded = usePlayerStore((s) => s.isExpanded);
  const closeExpanded = usePlayerStore((s) => s.closeExpanded);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [isLiked, setIsLiked] = React.useState(Boolean(currentTrack?.isLiked));
  const likeMutation = useLikeTrack();

  React.useEffect(() => {
    setIsLiked(Boolean(currentTrack?.isLiked));
  }, [currentTrack]);

  // Handle Escape key to dismiss
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        closeExpanded();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, closeExpanded]);

  if (!isExpanded || !currentTrack) return null;

  const artwork = currentTrack.artwork || currentTrack.artworkUrl;
  const artists = currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';

  const handleLikeToggle = () => {
    const nextState = !isLiked;
    setIsLiked(nextState);
    likeMutation.mutate({ trackId: currentTrack.id, isLiked: !nextState });
  };

  return (
    <div
      role="dialog"
      aria-label="Expanded Music Player"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-neutral-900/90 via-neutral-950 to-black p-4 sm:p-8 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Background ambient artwork glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30 blur-3xl">
        <div
          className="absolute -top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-600/30"
          style={{
            backgroundImage: artwork ? `url(${artwork})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={closeExpanded}
          aria-label="Minimize player"
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronDown className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
            Playing from collection
          </span>
          <span className="text-xs font-medium text-white truncate max-w-[200px] sm:max-w-xs">
            {currentTrack.album?.title || 'MUSIFY Stream'}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleQueue}
          aria-label="Toggle Queue"
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ListMusic className="h-5 w-5" />
        </button>
      </div>

      {/* Main Center Area */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-6 max-w-lg mx-auto w-full">
        {/* Large Artwork */}
        <div className="relative aspect-square w-full max-w-[320px] sm:max-w-[380px] overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl border border-white/10">
          <ImageWithFallback
            src={artwork}
            alt={currentTrack.title}
            fallbackIcon={<Disc3 className={cn('h-1/3 w-1/3 text-neutral-600', isPlaying && 'animate-spin-slow')} />}
            fill
            priority
            sizes="(max-width: 640px) 320px, 380px"
            className="object-cover"
          />
        </div>

        {/* Track Title, Artist, and Like button */}
        <div className="mt-8 flex items-center justify-between w-full px-2">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
              {currentTrack.title}
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 truncate mt-1">
              {artists}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLikeToggle}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors',
              isLiked && 'text-emerald-400 hover:text-emerald-300'
            )}
          >
            <Heart className={cn('h-6 w-6', isLiked && 'fill-current')} />
          </button>
        </div>

        {/* Progress Slider */}
        <div className="mt-6 w-full px-2">
          <PlayerProgress />
        </div>

        {/* Big Controls */}
        <div className="mt-6 flex items-center justify-center w-full">
          <PlayerControls size="lg" />
        </div>

        {/* Volume Slider in bottom bar */}
        <div className="mt-8 hidden sm:flex items-center justify-center w-full max-w-xs">
          <PlayerVolume sliderWidth="w-48" />
        </div>
      </div>
    </div>
  );
}
