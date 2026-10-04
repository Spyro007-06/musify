'use client';

import * as React from 'react';
import { Pencil, Loader2, Globe2, Lock } from 'lucide-react';
import { useUpdatePlaylist } from '@/hooks/use-playlists';
import { Dialog, DialogHeader, DialogActions } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/stores/toast-store';
import { Playlist } from '@/types/playlist';
import { cn } from '@/lib/utils/cn';

export interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Pick<Playlist, 'id' | 'title' | 'description' | 'isPublic'>;
}

const inputClass = cn(
  'w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white',
  'placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors'
);

export function EditPlaylistModal({ isOpen, onClose, playlist }: EditPlaylistModalProps) {
  const updateMutation = useUpdatePlaylist(playlist.id);
  const [title, setTitle] = React.useState(playlist.title);
  const [description, setDescription] = React.useState(playlist.description || '');
  const [isPublic, setIsPublic] = React.useState(playlist.isPublic);
  const [error, setError] = React.useState<string | null>(null);

  // Start from the saved values every time the dialog opens.
  React.useEffect(() => {
    if (!isOpen) return;
    setTitle(playlist.title);
    setDescription(playlist.description || '');
    setIsPublic(playlist.isPublic);
    setError(null);
  }, [isOpen, playlist.title, playlist.description, playlist.isPublic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Give your playlist a name.');
      return;
    }
    setError(null);
    try {
      await updateMutation.mutateAsync({ title: title.trim(), description, isPublic });
      toast.success('Playlist updated.');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your changes. Please try again.');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} labelledBy="edit-playlist-title" isBusy={updateMutation.isPending}>
      <DialogHeader icon={Pencil} title="Edit details" titleId="edit-playlist-title" onClose={onClose} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="space-y-1.5">
          <label htmlFor="edit-playlist-name" className="text-xs font-semibold text-neutral-300">
            Name
          </label>
          <input
            id="edit-playlist-name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            autoFocus
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-playlist-description" className="text-xs font-semibold text-neutral-300">
            Description
          </label>
          <textarea
            id="edit-playlist-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Add an optional description"
            className={cn(inputClass, 'resize-none')}
          />
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={() => setIsPublic((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-3 text-left"
        >
          <span className="flex items-center gap-3">
            {isPublic ? <Globe2 className="h-4 w-4 text-brand-400" /> : <Lock className="h-4 w-4 text-amber-400" />}
            <span>
              <span className="block text-sm font-semibold text-white">{isPublic ? 'Public' : 'Private'}</span>
              <span className="block text-xs text-neutral-400">
                {isPublic ? 'Anyone with the link can listen.' : 'Only you can see this playlist.'}
              </span>
            </span>
          </span>
          <span
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors',
              isPublic ? 'bg-brand-500' : 'bg-neutral-700'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                isPublic ? 'translate-x-[22px]' : 'translate-x-0.5'
              )}
            />
          </span>
        </button>

        <DialogActions onCancel={onClose} cancelDisabled={updateMutation.isPending}>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-xs font-semibold text-black',
              'hover:bg-brand-400 active:scale-95 transition-all shadow-lg shadow-brand-950/40',
              'disabled:opacity-50 disabled:pointer-events-none'
            )}
          >
            {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{updateMutation.isPending ? 'Saving...' : 'Save'}</span>
          </button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
