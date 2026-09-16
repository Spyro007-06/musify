'use client';

import * as React from 'react';
import { X, Plus, Check, Loader2, ListMusic } from 'lucide-react';
import { usePlaylists, useAddTrackToPlaylist } from '@/hooks/use-playlists';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { CreatePlaylistModal } from './create-playlist-modal';
import { Track } from '@/types/track';
import { cn } from '@/lib/utils/cn';

export interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

export function AddToPlaylistModal({ isOpen, onClose, track }: AddToPlaylistModalProps) {
  const { data: playlists, isLoading: isPlaylistsLoading } = usePlaylists();
  const addTrackMutation = useAddTrackToPlaylist();

  const [selectedPlaylistId, setSelectedPlaylistId] = React.useState<string | null>(null);
  const [successPlaylistId, setSuccessPlaylistId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  // Filter only custom playlists owned by the user (exclude dynamic movie soundtracks)
  const userPlaylists = React.useMemo(() => {
    if (!playlists) return [];
    return playlists.filter((p) => !p.id.startsWith('movie-') && p.owner !== 'Movie Soundtrack');
  }, [playlists]);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedPlaylistId(null);
      setSuccessPlaylistId(null);
      setErrorMessage(null);
    }
  }, [isOpen, track]);

  // Handle ESC key and body scroll lock
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !addTrackMutation.isPending) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, addTrackMutation.isPending]);

  if (!isOpen || !track) return null;

  const handleSelectPlaylist = async (playlistId: string) => {
    if (addTrackMutation.isPending) return;
    setSelectedPlaylistId(playlistId);
    setErrorMessage(null);

    try {
      await addTrackMutation.mutateAsync({
        playlistId,
        trackId: track.id,
      });

      setSuccessPlaylistId(playlistId);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add track to playlist.';
      setErrorMessage(message);
      setSelectedPlaylistId(null);
    }
  };

  const handlePlaylistCreated = async (newPlaylistId: string) => {
    // Automatically add track to the newly created playlist
    try {
      await addTrackMutation.mutateAsync({
        playlistId: newPlaylistId,
        trackId: track.id,
      });
      onClose();
    } catch {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => !addTrackMutation.isPending && onClose()}
        />

        {/* Modal Dialog */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-to-playlist-title"
          className={cn(
            'relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900/95 p-5 shadow-2xl backdrop-blur-xl',
            'animate-in fade-in zoom-in-95 duration-200'
          )}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={addTrackMutation.isPending}
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="mb-4 pr-6">
            <h2 id="add-to-playlist-title" className="text-lg font-bold text-white tracking-tight">
              Add to Playlist
            </h2>
            <p className="text-xs text-neutral-400 truncate mt-0.5">
              Select a playlist for <span className="text-white font-medium">&ldquo;{track.title}&rdquo;</span>
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Create new playlist button */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="w-full mb-3 flex items-center gap-3 rounded-xl border border-dashed border-neutral-700 bg-neutral-950/40 p-3 text-xs font-semibold text-neutral-300 hover:border-emerald-500/50 hover:bg-emerald-950/20 hover:text-emerald-400 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
              <Plus className="h-4 w-4" />
            </div>
            <span>Create New Playlist</span>
          </button>

          {/* Playlists List */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 -mr-1">
            {isPlaylistsLoading && (
              <div className="flex items-center justify-center py-6 text-xs text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading playlists...</span>
              </div>
            )}

            {!isPlaylistsLoading && userPlaylists.length === 0 && (
              <div className="text-center py-6 text-xs text-neutral-500">
                No custom playlists found. Create one above!
              </div>
            )}

            {!isPlaylistsLoading &&
              userPlaylists.map((playlist) => {
                const isSelected = selectedPlaylistId === playlist.id;
                const isSuccess = successPlaylistId === playlist.id;
                const cover = playlist.cover;

                return (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => handleSelectPlaylist(playlist.id)}
                    disabled={addTrackMutation.isPending}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl p-2.5 text-left transition-all',
                      isSuccess
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : isSelected
                        ? 'bg-neutral-800 text-white'
                        : 'hover:bg-white/5 text-neutral-300 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-neutral-800 shadow-sm">
                        <ImageWithFallback
                          src={cover}
                          alt={playlist.title}
                          fallbackIcon={<ListMusic className="h-4 w-4 text-neutral-500" />}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-semibold truncate text-white">
                          {playlist.title}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {playlist.tracksCount ?? 0} tracks
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSuccess ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : isSelected && addTrackMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                      ) : (
                        <Plus className="h-4 w-4 text-neutral-500 hover:text-white" />
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Sub-modal for creating a playlist if chosen from here */}
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handlePlaylistCreated}
      />
    </>
  );
}
