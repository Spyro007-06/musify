'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useDeletePlaylist } from '@/hooks/use-playlists';
import { Dialog, DialogHeader, DialogActions } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';

export interface DeletePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: string;
  playlistTitle: string;
  onDeleted?: () => void;
}

export function DeletePlaylistModal({
  isOpen,
  onClose,
  playlistId,
  playlistTitle,
  onDeleted,
}: DeletePlaylistModalProps) {
  const router = useRouter();
  const deleteMutation = useDeletePlaylist();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteMutation.mutateAsync(playlistId);
      onClose();
      toast.success(`"${playlistTitle}" was deleted.`);
      if (onDeleted) {
        onDeleted();
      } else {
        router.push('/library/playlists');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete playlist. Please try again.';
      setError(message);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} labelledBy="delete-playlist-title" isBusy={deleteMutation.isPending}>
      <DialogHeader
        icon={AlertTriangle}
        iconVariant="danger"
        title="Delete Playlist"
        titleId="delete-playlist-title"
        subtitle="This action cannot be undone"
      />

      <p className="text-sm text-neutral-300 mb-6">
        Are you sure you want to permanently delete{' '}
        <span className="font-semibold text-white">&ldquo;{playlistTitle}&rdquo;</span>? All tracks saved
        within this playlist will be removed.
      </p>

      {error && (
        <div className="mb-4">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}

      <DialogActions onCancel={onClose} cancelDisabled={deleteMutation.isPending}>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className={cn(
            'inline-flex items-center gap-2 rounded-full bg-danger-600 px-5 py-2 text-xs font-semibold text-white',
            'hover:bg-danger-500 active:scale-95 transition-all shadow-lg shadow-danger-950/40',
            'disabled:opacity-50 disabled:pointer-events-none'
          )}
        >
          {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{deleteMutation.isPending ? 'Deleting...' : 'Delete Playlist'}</span>
        </button>
      </DialogActions>
    </Dialog>
  );
}
