'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useDeletePlaylist } from '@/hooks/use-playlists';
import { useFocusTrap } from '@/hooks/use-focus-trap';
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
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Handle ESC key and body scroll lock
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !deleteMutation.isPending) {
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
  }, [isOpen, onClose, deleteMutation.isPending]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteMutation.mutateAsync(playlistId);
      onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => !deleteMutation.isPending && onClose()}
      />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-playlist-title"
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl border border-rose-500/20 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-xl',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 id="delete-playlist-title" className="text-lg font-bold text-white tracking-tight">
              Delete Playlist
            </h2>
            <p className="text-xs text-neutral-400">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-neutral-300 mb-6">
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold text-white">&ldquo;{playlistTitle}&rdquo;</span>? All tracks saved
          within this playlist will be removed.
        </p>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="rounded-full px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2 text-xs font-semibold text-white',
              'hover:bg-rose-500 active:scale-95 transition-all shadow-lg shadow-rose-950/40',
              'disabled:opacity-50 disabled:pointer-events-none'
            )}
          >
            {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{deleteMutation.isPending ? 'Deleting...' : 'Delete Playlist'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
