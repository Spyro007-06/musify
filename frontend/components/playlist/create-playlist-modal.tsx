'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, Music2, Globe2, Lock } from 'lucide-react';
import { useCreatePlaylist } from '@/hooks/use-playlists';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { cn } from '@/lib/utils/cn';

export interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (playlistId: string) => void;
}

export function CreatePlaylistModal({ isOpen, onClose, onCreated }: CreatePlaylistModalProps) {
  const router = useRouter();
  const createMutation = useCreatePlaylist();
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [coverUrl, setCoverUrl] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(true);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setCoverUrl('');
      setIsPublic(true);
      setValidationError(null);
    }
  }, [isOpen]);

  // Handle ESC key and body scroll lock
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !createMutation.isPending) {
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
  }, [isOpen, onClose, createMutation.isPending]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Playlist title is required');
      return;
    }

    if (trimmedTitle.length > 100) {
      setValidationError('Title must be under 100 characters');
      return;
    }

    if (description.length > 500) {
      setValidationError('Description must be under 500 characters');
      return;
    }

    const trimmedCover = coverUrl.trim();
    if (trimmedCover) {
      try {
        new URL(trimmedCover);
      } catch {
        setValidationError('Please enter a valid URL for the cover image');
        return;
      }
    }

    try {
      const newPlaylist = await createMutation.mutateAsync({
        title: trimmedTitle,
        description: description.trim() || undefined,
        coverUrl: trimmedCover || undefined,
        isPublic,
      });

      onClose();
      if (newPlaylist?.id) {
        if (onCreated) {
          onCreated(newPlaylist.id);
        } else {
          router.push(`/playlists/${newPlaylist.id}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create playlist. Please try again.';
      setValidationError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => !createMutation.isPending && onClose()}
      />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-playlist-title"
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-xl',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={createMutation.isPending}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Music2 className="h-5 w-5" />
          </div>
          <div>
            <h2 id="create-playlist-title" className="text-xl font-bold text-white tracking-tight">
              Create Playlist
            </h2>
            <p className="text-xs text-neutral-400">Add a new collection to your library</p>
          </div>
        </div>

        {/* Error message */}
        {validationError && (
          <div role="alert" className="mb-4 rounded-lg bg-danger-500/10 border border-danger-500/20 p-3 text-xs text-danger-300">
            {validationError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title input */}
          <div className="space-y-1.5">
            <label htmlFor="playlist-title" className="text-xs font-semibold text-neutral-300">
              Title <span className="text-brand-400">*</span>
            </label>
            <input
              id="playlist-title"
              type="text"
              autoFocus
              placeholder="My awesome playlist"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={createMutation.isPending}
              className={cn(
                'w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white',
                'placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors'
              )}
            />
          </div>

          {/* Description input */}
          <div className="space-y-1.5">
            <label htmlFor="playlist-description" className="text-xs font-semibold text-neutral-300">
              Description <span className="text-xs font-normal text-neutral-500">(optional)</span>
            </label>
            <textarea
              id="playlist-description"
              rows={3}
              placeholder="Give your playlist a mood or description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={createMutation.isPending}
              className={cn(
                'w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white resize-none',
                'placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors'
              )}
            />
          </div>

          {/* Cover URL input */}
          <div className="space-y-1.5">
            <label htmlFor="playlist-cover" className="text-xs font-semibold text-neutral-300">
              Cover Image URL <span className="text-xs font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="playlist-cover"
              type="url"
              placeholder="https://example.com/artwork.jpg"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              disabled={createMutation.isPending}
              className={cn(
                'w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white',
                'placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors'
              )}
            />
          </div>

          {/* Public / Private toggle */}
          <div className="flex items-center justify-between rounded-xl border border-neutral-800/80 bg-neutral-950/50 p-3">
            <div className="flex items-center gap-2.5">
              {isPublic ? (
                <Globe2 className="h-4 w-4 text-brand-400" />
              ) : (
                <Lock className="h-4 w-4 text-neutral-400" />
              )}
              <div>
                <p className="text-xs font-medium text-white">
                  {isPublic ? 'Public Playlist' : 'Private Playlist'}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {isPublic ? 'Anyone can listen to this playlist' : 'Only you can view this playlist'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              disabled={createMutation.isPending}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                isPublic ? 'bg-brand-500' : 'bg-neutral-800'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200',
                  isPublic ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="rounded-full px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-xs font-semibold text-black',
                'hover:bg-brand-400 active:scale-95 transition-all shadow-lg shadow-brand-950/40',
                'disabled:opacity-50 disabled:pointer-events-none'
              )}
            >
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{createMutation.isPending ? 'Creating...' : 'Create'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
