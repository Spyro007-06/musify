'use client';

import * as React from 'react';
import { Plus, Check, Loader2, ListMusic } from 'lucide-react';
import { usePlaylists, useAddTrackToPlaylist } from '@/hooks/use-playlists';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/stores/toast-store';
import { CreatePlaylistModal } from './create-playlist-modal';
import { Track } from '@/types/track';
import { cn } from '@/lib/utils/cn';
import { pluralize } from '@/lib/utils/pluralize';

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

  if (!track) return null;

  const handleSelectPlaylist = async (playlistId: string, playlistTitle: string) => {
    if (addTrackMutation.isPending) return;
    setSelectedPlaylistId(playlistId);
    setErrorMessage(null);

    try {
      await addTrackMutation.mutateAsync({
        playlistId,
        trackId: track.id,
      });

      setSuccessPlaylistId(playlistId);
      toast.success(`Added "${track.title}" to ${playlistTitle}.`);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add track to playlist.';
      setErrorMessage(message);
      setSelectedPlaylistId(null);
    }
  };

  const handlePlaylistCreated = async (newPlaylistId: string, newPlaylistTitle: string) => {
    // Automatically add track to the newly created playlist
    try {
      await addTrackMutation.mutateAsync({
        playlistId: newPlaylistId,
        trackId: track.id,
      });
      toast.success(`Added "${track.title}" to ${newPlaylistTitle}.`);
      onClose();
    } catch {
      onClose();
    }
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        labelledBy="add-to-playlist-title"
        isBusy={addTrackMutation.isPending}
        trapFocus={!isCreateOpen}
        maxWidth="max-w-sm"
        className="p-5"
      >
        <DialogHeader
          icon={ListMusic}
          title="Add to Playlist"
          titleId="add-to-playlist-title"
          subtitle={
            <>
              Select a playlist for <span className="text-white font-medium">&ldquo;{track.title}&rdquo;</span>
            </>
          }
          onClose={onClose}
          closeDisabled={addTrackMutation.isPending}
        />

        {errorMessage && (
          <div className="mb-3">
            <Alert variant="danger">{errorMessage}</Alert>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="w-full mb-3 flex items-center gap-3 rounded-xl border border-dashed border-neutral-700 bg-neutral-950/40 p-3 text-xs font-semibold text-neutral-300 hover:border-brand-500/50 hover:bg-brand-950/20 hover:text-brand-400 transition-all"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
            <Plus className="h-4 w-4" />
          </div>
          <span>Create New Playlist</span>
        </button>

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
                  onClick={() => handleSelectPlaylist(playlist.id, playlist.title)}
                  disabled={addTrackMutation.isPending}
                  className={cn(
                    'w-full flex items-center justify-between rounded-xl p-2.5 text-left transition-all',
                    isSuccess
                      ? 'bg-brand-500/20 border border-brand-500/40 text-brand-300'
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
                        {pluralize(playlist.tracksCount ?? 0, 'track')}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSuccess ? (
                      <Check className="h-4 w-4 text-brand-400" />
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
      </Dialog>

      {/* Sub-modal for creating a playlist if chosen from here */}
      <CreatePlaylistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handlePlaylistCreated}
      />
    </>
  );
}
