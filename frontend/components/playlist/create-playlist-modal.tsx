'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Music2, Globe2, Lock } from 'lucide-react';
import { useCreatePlaylist, useImportSpotifyPlaylist } from '@/hooks/use-playlists';
import type { SpotifyImportResult } from '@/lib/api/playlists';
import { Dialog, DialogHeader, DialogActions } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';

export interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (playlistId: string, playlistTitle: string) => void;
}

export function CreatePlaylistModal({ isOpen, onClose, onCreated }: CreatePlaylistModalProps) {
  const router = useRouter();
  const createMutation = useCreatePlaylist();
  const importMutation = useImportSpotifyPlaylist();
  const isBusy = createMutation.isPending || importMutation.isPending;

  // Importing only makes sense from the library; the "add to playlist" flow
  // (onCreated) needs a fresh, empty playlist.
  const canImport = !onCreated;
  const [mode, setMode] = React.useState<'create' | 'import'>('create');
  const [spotifyUrl, setSpotifyUrl] = React.useState('');
  const [importResult, setImportResult] = React.useState<SpotifyImportResult | null>(null);

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
      setMode('create');
      setSpotifyUrl('');
      setImportResult(null);
    }
  }, [isOpen]);

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
          // The caller (e.g. "add to playlist") shows its own follow-up
          // toast once it's done acting on the new playlist — avoid a
          // redundant "created" toast a beat before that one.
          onCreated(newPlaylist.id, trimmedTitle);
        } else {
          toast.success(`"${trimmedTitle}" was created.`);
          router.push(`/playlists/${newPlaylist.id}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create playlist. Please try again.';
      setValidationError(message);
    }
  };

  const openPlaylist = (id: string) => {
    onClose();
    router.push(`/playlists/${id}`);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!/open\.spotify\.com\/(.+\/)?playlist\/[A-Za-z0-9]{22}|^spotify:playlist:[A-Za-z0-9]{22}$/.test(spotifyUrl.trim())) {
      setValidationError('Paste a Spotify playlist link, like https://open.spotify.com/playlist/…');
      return;
    }

    try {
      const result = await importMutation.mutateAsync(spotifyUrl.trim());
      if (!result) return;
      if (result.unmatched.length === 0) {
        toast.success(`Imported "${result.playlist.title}" with all ${result.total} songs.`);
        openPlaylist(result.playlist.id);
      } else {
        setImportResult(result);
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Import failed. Please try again.');
    }
  };

  const inputClass = cn(
    'w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white',
    'placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors'
  );
  const primaryButtonClass = cn(
    'inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-xs font-semibold text-black',
    'hover:bg-brand-400 active:scale-95 transition-all shadow-lg shadow-brand-950/40',
    'disabled:opacity-50 disabled:pointer-events-none'
  );

  return (
    <Dialog isOpen={isOpen} onClose={onClose} labelledBy="create-playlist-title" isBusy={isBusy}>
      <DialogHeader
        icon={Music2}
        title={mode === 'import' ? 'Import from Spotify' : 'Create Playlist'}
        titleId="create-playlist-title"
        subtitle={mode === 'import' ? 'Bring a public Spotify playlist into Musify' : 'Add a new collection to your library'}
        onClose={onClose}
        closeDisabled={isBusy}
      />

      {canImport && !importResult && (
        <div role="tablist" aria-label="Playlist source" className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-neutral-800 bg-neutral-950 p-1">
          {(['create', 'import'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              disabled={isBusy}
              onClick={() => { setMode(m); setValidationError(null); }}
              className={cn(
                'rounded-full py-1.5 text-xs font-semibold transition-colors',
                mode === m ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              )}
            >
              {m === 'create' ? 'New playlist' : 'Import from Spotify'}
            </button>
          ))}
        </div>
      )}

      {validationError && (
        <div className="mb-4">
          <Alert variant="danger">{validationError}</Alert>
        </div>
      )}

      {importResult ? (
        <div className="space-y-4">
          <Alert variant="success">
            Imported {importResult.matched.length} of {importResult.total} songs into &ldquo;{importResult.playlist.title}&rdquo;.
          </Alert>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-neutral-300">
              Not found on JioSaavn ({importResult.unmatched.length})
            </p>
            <ul className="max-h-48 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs">
              {importResult.unmatched.map((t, i) => (
                <li key={i} className="truncate py-1 text-neutral-400">
                  <span className="text-white">{t.title}</span> · {t.artist}
                </li>
              ))}
            </ul>
          </div>
          <DialogActions onCancel={onClose} cancelLabel="Close">
            <button type="button" onClick={() => openPlaylist(importResult.playlist.id)} className={primaryButtonClass}>
              Open playlist
            </button>
          </DialogActions>
        </div>
      ) : mode === 'import' ? (
        <form key="import" onSubmit={handleImport} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="spotify-url" className="text-xs font-semibold text-neutral-300">
              Spotify playlist link <span className="text-brand-400">*</span>
            </label>
            <input
              id="spotify-url"
              type="url"
              autoFocus
              placeholder="https://open.spotify.com/playlist/…"
              value={spotifyUrl}
              onChange={(e) => setSpotifyUrl(e.target.value)}
              disabled={isBusy}
              className={inputClass}
            />
            <p className="text-[11px] text-neutral-500">
              The playlist must be public. Up to the first 100 songs are matched on JioSaavn; this can take a few seconds.
            </p>
          </div>
          <div className="pt-2">
            <DialogActions onCancel={onClose} cancelDisabled={isBusy}>
              <button type="submit" disabled={isBusy || !spotifyUrl.trim()} className={primaryButtonClass}>
                {importMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{importMutation.isPending ? 'Matching songs…' : 'Import'}</span>
              </button>
            </DialogActions>
          </div>
        </form>
      ) : (
      <form key="create" onSubmit={handleSubmit} className="space-y-4">
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

        <div className="pt-2">
          <DialogActions onCancel={onClose} cancelDisabled={createMutation.isPending}>
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
          </DialogActions>
        </div>
      </form>
      )}
    </Dialog>
  );
}
