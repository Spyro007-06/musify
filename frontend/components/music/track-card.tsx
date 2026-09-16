'use client';

import * as React from 'react';
import { Play, Pause } from 'lucide-react';
import { Track } from '@/types/track';
import { cn } from '@/lib/utils/cn';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { usePlayerStore } from '@/stores/player-store';

export interface TrackCardProps {
  track: Track;
  onPlay?: (track: Track) => void;
  className?: string;
}

export function TrackCard({ track, onPlay, className }: TrackCardProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const isCurrentTrack = currentTrack?.id === track.id;
  const isTrackPlaying = isCurrentTrack && isPlaying;

  const artwork = track.artwork;
  const artistNames = track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';

  const handleClick = () => {
    if (isCurrentTrack) {
      togglePlay();
    } else if (onPlay) {
      onPlay(track);
    } else {
      playTrack(track);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex flex-col rounded-xl bg-neutral-900/40 p-3 border select-none',
        'cursor-pointer transition-all duration-300',
        isCurrentTrack
          ? 'border-emerald-500/30 bg-neutral-850 shadow-lg shadow-black/40'
          : 'border-white/5 hover:border-white/10 hover:bg-neutral-850 hover:shadow-xl hover:shadow-black/40',
        className
      )}
    >
      {/* Artwork container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-800 shadow-md">
        <ImageWithFallback
          src={artwork}
          alt={track.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient shadow overlay */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300',
            isCurrentTrack ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />

        {/* Floating Play/Pause Button */}
        <button
          type="button"
          onClick={handlePlayClick}
          aria-label={isTrackPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className={cn(
            'absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full',
            'bg-emerald-500 text-black shadow-lg shadow-emerald-950/60',
            'hover:scale-105 active:scale-95 transition-all duration-300 z-10',
            isCurrentTrack
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          )}
        >
          {isTrackPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Track info */}
      <div className="mt-3 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4
            className={cn(
              'truncate text-sm font-semibold transition-colors',
              isCurrentTrack
                ? 'text-emerald-400'
                : 'text-white group-hover:text-emerald-400'
            )}
          >
            {track.title}
          </h4>
          {track.isExplicit && (
            <span className="shrink-0 rounded bg-neutral-700/80 px-1 py-0.5 text-[9px] font-bold text-neutral-300">
              E
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">
          {artistNames}
        </p>
      </div>
    </div>
  );
}
