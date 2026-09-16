'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  ListMusic,
  Trash2,
  Lock,
  Globe2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Music2,
} from 'lucide-react';
import { usePlaylist, useRemoveTrackFromPlaylist } from '@/hooks/use-playlists';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';
import { TrackRow } from '@/components/music/track-row';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { DeletePlaylistModal } from '@/components/playlist/delete-playlist-modal';
import { Track } from '@/types/track';

interface PlaylistPageProps {
  params: Promise<{ id: string }>;
}

export default function PlaylistDetailPage({ params }: PlaylistPageProps) {
  const { id: playlistId } = React.use(params);

  const user = useAuthStore((s) => s.user);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const { data: playlist, isLoading, isError, error, refetch } = usePlaylist(playlistId);
  const removeTrackMutation = useRemoveTrackFromPlaylist();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Check ownership
  // A playlist is editable if the logged-in user's username matches playlist.owner and it is not a movie soundtrack
  const isOwner = React.useMemo(() => {
    if (!user || !playlist) return false;
    if (playlist.id.startsWith('movie-') || playlist.owner === 'Movie Soundtrack') {
      return false;
    }
    return playlist.owner === user.username;
  }, [user, playlist]);

  const tracks = React.useMemo(() => playlist?.tracks || [], [playlist?.tracks]);
  const hasTracks = tracks.length > 0;

  // Check if current playing track belongs to this playlist
  const isCollectionPlaying =
    isPlaying && currentTrack && tracks.some((t) => t.id === currentTrack.id);

  // Calculate total duration
  const totalDurationSeconds = React.useMemo(() => {
    return tracks.reduce(
      (acc, t) =>
        acc + (t.duration ?? t.durationSeconds ?? (t.durationMs ? t.durationMs / 1000 : 0)),
      0
    );
  }, [tracks]);

  const formattedTotalTime = React.useMemo(() => {
    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  }, [totalDurationSeconds]);

  const handlePlayAll = () => {
    if (!hasTracks) return;
    if (isCollectionPlaying) {
      togglePlay();
    } else {
      playTrack(tracks[0], tracks);
    }
  };

  const handlePlayTrack = (track: Track) => {
    playTrack(track, tracks);
  };

  const handleRemoveTrack = async (track: Track) => {
    if (!playlist) return;
    setActionError(null);
    try {
      await removeTrackMutation.mutateAsync({
        playlistId: playlist.id,
        trackId: track.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove track from playlist.';
      setActionError(message);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="space-y-8 pb-16">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 bg-neutral-800 rounded-full" />
        </div>
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 rounded-3xl bg-neutral-900/40 p-6 sm:p-8 border border-white/5">
          <Skeleton className="aspect-square w-40 sm:w-52 rounded-2xl bg-neutral-800 shrink-0" />
          <div className="space-y-4 flex-1 w-full">
            <Skeleton className="h-5 w-24 rounded-full bg-neutral-800" />
            <Skeleton className="h-10 w-3/4 max-w-md bg-neutral-800 rounded-lg" />
            <Skeleton className="h-4 w-1/2 max-w-sm bg-neutral-800 rounded" />
            <Skeleton className="h-4 w-32 bg-neutral-800 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`playlist-skel-${i}`}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-neutral-900/30 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 bg-neutral-800 rounded" />
                <Skeleton className="h-10 w-10 bg-neutral-800 rounded-md" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-44 bg-neutral-800 rounded" />
                  <Skeleton className="h-3 w-28 bg-neutral-800 rounded" />
                </div>
              </div>
              <Skeleton className="h-4 w-12 bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error States (403 Forbidden / 404 Not Found / General Error)
  if (isError || !playlist) {
    const errorWithStatus = error as (Error & { status?: number; statusCode?: number }) | null;
    const errorStatus = errorWithStatus?.status || errorWithStatus?.statusCode;
    const isForbidden = errorStatus === 403 || error?.message?.toLowerCase().includes('denied');
    const isNotFound = errorStatus === 404 || error?.message?.toLowerCase().includes('not found');

    return (
      <div className="space-y-6 pb-16">
        <Link
          href="/library/playlists"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Playlists</span>
        </Link>

        <div className="flex flex-col items-center justify-center rounded-3xl border border-neutral-800 bg-neutral-900/40 p-12 text-center max-w-lg mx-auto">
          {isForbidden ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mb-4 border border-amber-500/20">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Private Playlist</h2>
              <p className="mt-2 text-xs sm:text-sm text-neutral-400">
                This playlist is private and can only be viewed by its owner.
              </p>
            </>
          ) : isNotFound ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800 text-neutral-400 mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Playlist Not Found</h2>
              <p className="mt-2 text-xs sm:text-sm text-neutral-400">
                The playlist you are looking for does not exist or has been removed.
              </p>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 mb-4 border border-rose-500/20">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Failed to Load Playlist</h2>
              <p className="mt-2 text-xs sm:text-sm text-neutral-400">
                {error?.message || 'An unexpected error occurred while loading this playlist.'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
            </>
          )}

          <Link
            href="/library/playlists"
            className="mt-6 rounded-full border border-neutral-700 bg-neutral-800 px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
          >
            Explore Your Playlists
          </Link>
        </div>
      </div>
    );
  }

  const coverSrc = playlist.cover;
  const ownerName = playlist.owner || 'MUSIFY';

  const isSoundtrack = playlist.id.startsWith('movie-') || playlist.owner === 'Movie Soundtrack';

  return (
    <div className="space-y-8 pb-16">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/library/playlists"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Playlists</span>
        </Link>
      </div>

      {/* Action error banner if remove fails */}
      {actionError && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center justify-between">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-neutral-400 hover:text-white ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. Header / Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-850 via-neutral-900/90 to-black p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 text-center sm:text-left">
          {/* Cover image */}
          <div className="relative aspect-square w-40 sm:w-52 shrink-0 overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl border border-white/10">
            <ImageWithFallback
              src={coverSrc}
              alt={playlist.title}
              fallbackIcon={<ListMusic className="h-1/3 w-1/3 text-neutral-600" />}
              fill
              sizes="(max-width: 640px) 160px, 208px"
              className="object-cover"
            />
          </div>

          {/* Metadata details */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                <span>{isSoundtrack ? 'Soundtrack' : 'Playlist'}</span>
              </span>

              {!isSoundtrack && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] text-neutral-400 border border-white/5">
                  {playlist.isPublic ? (
                    <>
                      <Globe2 className="h-3 w-3 text-emerald-400" />
                      <span>Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 text-amber-400" />
                      <span>Private</span>
                    </>
                  )}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white break-words">
              {playlist.title}
            </h1>

            {playlist.description && (
              <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl leading-relaxed">
                {playlist.description}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-neutral-300">
              <span className="font-semibold text-white">{ownerName}</span>
              <span>&bull;</span>
              <span>{tracks.length} songs</span>
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

      {/* 2. Action Controls Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          {hasTracks && (
            <button
              type="button"
              onClick={handlePlayAll}
              aria-label={isCollectionPlaying ? 'Pause playlist' : 'Play all playlist tracks'}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-black shadow-xl shadow-emerald-950/60 hover:scale-105 active:scale-95 hover:bg-emerald-400 transition-all duration-300"
            >
              {isCollectionPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current ml-0.5" />
              )}
            </button>
          )}
        </div>

        {/* Delete button (Owner only) */}
        {isOwner && (
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            aria-label="Delete playlist"
            className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 hover:border-rose-500/40 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Playlist</span>
          </button>
        )}
      </div>

      {/* 3. Empty Playlist State */}
      {!hasTracks && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-800 text-neutral-500 mb-3">
            <Music2 className="h-7 w-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-bold text-white">This playlist is empty</h3>
          <p className="mt-1 text-xs text-neutral-400 max-w-sm">
            {isOwner
              ? 'Browse songs across MUSIFY and tap the Add to Playlist button to build this collection.'
              : 'The creator has not added any songs to this playlist yet.'}
          </p>
          <Link
            href="/discover"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors"
          >
            <span>Discover Music</span>
          </Link>
        </div>
      )}

      {/* 4. Track List */}
      {hasTracks && (
        <div className="space-y-1">
          {tracks.map((track, index) => (
            <TrackRow
              key={`playlist-track-${track.id}-${index}`}
              track={track}
              index={index}
              showAlbum={true}
              onPlay={handlePlayTrack}
              onRemove={isOwner ? handleRemoveTrack : undefined}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isOwner && (
        <DeletePlaylistModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          playlistId={playlist.id}
          playlistTitle={playlist.title}
        />
      )}
    </div>
  );
}
