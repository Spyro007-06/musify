'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Heart, Volume2, ListPlus, Trash2 } from 'lucide-react';
import { Track } from '@/types/track';
import { formatDuration } from '@/lib/utils/format-duration';
import { cn } from '@/lib/utils/cn';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { useLikeTrack } from '@/hooks/use-music';
import { usePlayerStore } from '@/stores/player-store';
import { useAuthStore } from '@/stores/auth-store';
import { AddToPlaylistModal } from '@/components/playlist/add-to-playlist-modal';

export interface TrackRowProps {
  track: Track;
  index?: number;
  onPlay?: (track: Track) => void;
  onRemove?: (track: Track) => void;
  onAddToPlaylist?: (track: Track) => void;
  showAlbum?: boolean;
  className?: string;
}

export function TrackRow({
  track,
  index,
  onPlay,
  onRemove,
  onAddToPlaylist,
  showAlbum = false,
  className,
}: TrackRowProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  const isCurrentTrack = currentTrack?.id === track.id;
  const isTrackPlaying = isCurrentTrack && isPlaying;

  const artwork = track.artwork || track.artworkUrl;
  const artistNames = track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
  const durationSecs =
    track.duration ?? (track.durationMs ? track.durationMs / 1000 : track.durationSeconds ?? 0);

  const [isLiked, setIsLiked] = React.useState(Boolean(track.isLiked));
  const likeMutation = useLikeTrack();

  React.useEffect(() => {
    setIsLiked(Boolean(track.isLiked));
  }, [track.isLiked]);

  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likeMutation.isPending) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    likeMutation.mutate({ trackId: track.id, isLiked: wasLiked, track });
  };

  const handleAddToPlaylistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (onAddToPlaylist) {
      onAddToPlaylist(track);
    } else {
      setIsAddModalOpen(true);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(track);
  };

  const handleClick = () => {
    if (isCurrentTrack) {
      togglePlay();
    } else if (onPlay) {
      onPlay(track);
    } else {
      playTrack(track);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className={cn(
          'group flex items-center justify-between rounded-xl px-3 py-2 text-sm',
          'border cursor-pointer transition-all duration-200 select-none',
          isCurrentTrack
            ? 'bg-white/[0.08] border-emerald-500/20'
            : 'hover:bg-white/[0.06] border-transparent hover:border-white/5',
          className
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 pr-3">
          {/* Index or Play/Pause button toggle */}
          {typeof index === 'number' && (
            <div className="flex h-5 w-5 shrink-0 items-center justify-center text-xs text-neutral-400">
              {isTrackPlaying ? (
                <Volume2 className="h-4 w-4 text-emerald-400 animate-pulse group-hover:hidden" />
              ) : (
                <span className="group-hover:hidden">{index + 1}</span>
              )}
              <button
                type="button"
                aria-label={isTrackPlaying ? 'Pause' : 'Play'}
                className="hidden group-hover:block"
              >
                {isTrackPlaying ? (
                  <Pause className="h-3.5 w-3.5 fill-current text-white" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current text-white" />
                )}
              </button>
            </div>
          )}

          {/* Thumbnail */}
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-800 shadow-sm">
            <ImageWithFallback
              src={artwork}
              alt={track.title}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>

          {/* Title & Artist */}
          <div className="overflow-hidden pr-2 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  'truncate font-medium transition-colors',
                  isCurrentTrack
                    ? 'text-emerald-400'
                    : 'text-white group-hover:text-emerald-400'
                )}
              >
                {track.title}
              </p>
              {track.isExplicit && (
                <span className="shrink-0 rounded bg-neutral-700/80 px-1 py-0.2 text-[9px] font-bold text-neutral-300">
                  E
                </span>
              )}
            </div>
            <p className="truncate text-xs text-neutral-400 group-hover:text-neutral-300 transition-colors">
              {artistNames}
            </p>
          </div>

          {/* Album Title (optional, visible on larger screens) */}
          {showAlbum && track.album?.title && (
            <div className="hidden lg:block w-48 shrink-0 truncate text-xs text-neutral-400 group-hover:text-neutral-300">
              {track.album.title}
            </div>
          )}
        </div>

        {/* Right side: Actions + Duration */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Add to playlist button */}
          <button
            type="button"
            onClick={handleAddToPlaylistClick}
            aria-label={`Add ${track.title} to playlist`}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white hover:bg-white/10 transition-all"
          >
            <ListPlus className="h-4 w-4" />
          </button>

          {/* Remove from playlist button (if playlist owner) */}
          {onRemove && (
            <button
              type="button"
              onClick={handleRemoveClick}
              aria-label={`Remove ${track.title} from playlist`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* Like toggle */}
          <button
            type="button"
            onClick={handleLikeToggle}
            disabled={likeMutation.isPending}
            aria-label={isLiked ? 'Unlike' : 'Like'}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:text-white transition-colors disabled:opacity-50',
              isLiked
                ? 'text-emerald-500 hover:text-emerald-400 opacity-100'
                : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
            )}
          >
            <Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />
          </button>

          {/* Duration */}
          <span className="text-xs text-neutral-400 font-variant-numeric tabular-nums w-10 text-right">
            {formatDuration(durationSecs)}
          </span>
        </div>
      </div>

      {/* Embedded AddToPlaylistModal if triggered locally */}
      {!onAddToPlaylist && (
        <AddToPlaylistModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          track={track}
        />
      )}
    </>
  );
}
