'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Music2, Globe2, Lock } from 'lucide-react';
import { useCreatePlaylist, useImportSpotifyPlaylist } from '@/hooks/use-playlists';
import { playlistsApi, type ImportSong } from '@/lib/api/playlists';
import { dedupeSongs, importInBatches, parseSpotifyTrackIds, screenshotToSlices } from '@/lib/playlist-import';
import { Dialog, DialogHeader, DialogActions } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';

export interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (playlistId: string, playlistTitle: string) => void;
}

type Mode = 'create' | 'import' | 'screenshots';

const MODE_LABELS: Record<Mode, string> = { create: 'New playlist', import: 'Spotify link', screenshots: 'Screenshots' };

/** Where an import stands; shown on the result screen and grown by "add the rest". */
interface ImportSummary {
  playlist: { id: string; title: string };
  total: number;
  unmatched: ImportSong[];
  /** Songs never sent because the connection kept failing. */
  notSent: number;
  /** Spotify songs already covered, skipped when the user pastes the full list. */
  knownSpotifyIds: string[];
  /** The link only gave the first 100 songs; offer the paste step. */
  mayHaveMore: boolean;
}

interface Progress {
  label: string;
  done: number;
  total: number;
}

export function CreatePlaylistModal({ isOpen, onClose, onCreated }: CreatePlaylistModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createMutation = useCreatePlaylist();
  const importMutation = useImportSpotifyPlaylist();
  const [progress, setProgress] = React.useState<Progress | null>(null);
  const isBusy = createMutation.isPending || importMutation.isPending || progress !== null;

  // Importing only makes sense from the library; the "add to playlist" flow
  // (onCreated) needs a fresh, empty playlist.
  const canImport = !onCreated;
  const [mode, setMode] = React.useState<Mode>('create');
  const [spotifyUrl, setSpotifyUrl] = React.useState('');
  const [pastedSongs, setPastedSongs] = React.useState('');
  const [screenshots, setScreenshots] = React.useState<File[]>([]);
  const [summary, setSummary] = React.useState<ImportSummary | null>(null);

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
      setPastedSongs('');
      setScreenshots([]);
      setSummary(null);
      setProgress(null);
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
      if (result.unmatched.length === 0 && !result.mayHaveMore) {
        toast.success(`Imported "${result.playlist.title}" with all ${result.total} songs.`);
        openPlaylist(result.playlist.id);
      } else {
        setSummary({
          playlist: result.playlist,
          total: result.total,
          unmatched: result.unmatched,
          notSent: 0,
          knownSpotifyIds: result.spotifyIds ?? [],
          mayHaveMore: result.mayHaveMore,
        });
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Import failed. Please try again.');
    }
  };

  const refreshPlaylist = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ['playlists', 'detail', id] });
    queryClient.invalidateQueries({ queryKey: ['playlists', 'user'] });
  };

  // Step two of a big Spotify import: the songs the link couldn't give us,
  // pasted from Spotify's own "select all, copy".
  const handleAddRest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary) return;
    setValidationError(null);

    const pasted = parseSpotifyTrackIds(pastedSongs);
    const known = new Set(summary.knownSpotifyIds);
    const ids = pasted.filter((id) => !known.has(id));
    if (ids.length === 0) {
      setValidationError(
        pasted.length > 0
          ? 'Those songs are already in the playlist.'
          : 'No Spotify songs found in what you pasted. Copy the songs themselves, not the playlist link.'
      );
      return;
    }

    try {
      const r = await importInBatches(summary.playlist.id, { spotifyIds: ids }, (done, total) =>
        setProgress({ label: 'Adding songs', done, total })
      );
      const sent = ids.slice(0, ids.length - r.notSent); // batches go in order, so the unsent are the tail
      setSummary({
        ...summary,
        total: summary.total + sent.length,
        unmatched: [...summary.unmatched, ...r.unmatched],
        notSent: r.notSent,
        knownSpotifyIds: [...summary.knownSpotifyIds, ...sent],
        mayHaveMore: r.notSent > 0, // keep the paste box so they can retry
      });
      setPastedSongs('');
      refreshPlaylist(summary.playlist.id);
    } finally {
      setProgress(null);
    }
  };

  const handleScreenshots = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (screenshots.length === 0) {
      setValidationError('Choose at least one screenshot.');
      return;
    }

    try {
      const found: ImportSong[] = [];
      for (let i = 0; i < screenshots.length; i++) {
        setProgress({ label: 'Reading screenshots', done: i, total: screenshots.length });
        for (const slice of await screenshotToSlices(screenshots[i])) {
          const read = () => playlistsApi.readScreenshot('image/jpeg', slice);
          // One retry: the backend may be waking up, or the model briefly busy.
          const res = await read().catch(() => new Promise((r) => setTimeout(r, 2000)).then(read));
          found.push(...(res.data?.songs ?? []));
        }
      }
      const songs = dedupeSongs(found);
      if (songs.length === 0) {
        setValidationError('No songs found in those screenshots. Make sure the song names are readable.');
        return;
      }

      const playlistTitle = (title.trim() || 'Imported playlist').slice(0, 100);
      const playlist = await createMutation.mutateAsync({ title: playlistTitle, description: 'Imported from screenshots.' });
      if (!playlist?.id) throw new Error('Could not create the playlist.');

      const r = await importInBatches(playlist.id, { songs }, (done, total) =>
        setProgress({ label: 'Matching songs', done, total })
      );
      refreshPlaylist(playlist.id);
      setSummary({
        playlist: { id: playlist.id, title: playlistTitle },
        total: songs.length,
        unmatched: r.unmatched,
        notSent: r.notSent,
        knownSpotifyIds: [],
        mayHaveMore: false,
      });
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Import failed. Please try again.');
    } finally {
      setProgress(null);
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
        title={mode === 'import' ? 'Import from Spotify' : mode === 'screenshots' ? 'Import from screenshots' : 'Create Playlist'}
        titleId="create-playlist-title"
        subtitle={
          mode === 'import'
            ? 'Bring a public Spotify playlist into Musify'
            : mode === 'screenshots'
              ? 'Snap a playlist in any music app and bring it into Musify'
              : 'Add a new collection to your library'
        }
        onClose={onClose}
        closeDisabled={isBusy}
      />

      {canImport && !summary && (
        <div role="tablist" aria-label="Playlist source" className="mb-4 grid grid-cols-3 gap-1 rounded-full border border-neutral-800 bg-neutral-950 p-1">
          {(['create', 'import', 'screenshots'] as const).map((m) => (
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
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}

      {validationError && (
        <div className="mb-4">
          <Alert variant="danger">{validationError}</Alert>
        </div>
      )}

      {summary ? (
        <div className="space-y-4">
          <Alert variant="success">
            Imported {summary.total - summary.unmatched.length - summary.notSent} of {summary.total} songs into &ldquo;
            {summary.playlist.title}&rdquo;.
          </Alert>
          {summary.notSent > 0 && (
            <Alert variant="warning">
              {summary.notSent} songs weren&rsquo;t added because the connection dropped.
              {summary.mayHaveMore && ' Paste the songs again to retry; ones already added are skipped.'}
            </Alert>
          )}

          {summary.mayHaveMore && (
            <form onSubmit={handleAddRest} className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-950/50 p-3.5">
              <label htmlFor="pasted-songs" className="text-xs font-semibold text-white">
                Add the rest of the songs
              </label>
              <p className="text-[11px] leading-relaxed text-neutral-400">
                A Spotify link only gives the first 100 songs. For the rest, open the playlist in Spotify on a computer,
                click any song, press <kbd className="text-neutral-200">Ctrl+A</kbd> then <kbd className="text-neutral-200">Ctrl+C</kbd>{' '}
                (<kbd className="text-neutral-200">⌘A</kbd>, <kbd className="text-neutral-200">⌘C</kbd> on a Mac), and paste here.
              </p>
              <textarea
                id="pasted-songs"
                rows={3}
                placeholder="https://open.spotify.com/track/…"
                value={pastedSongs}
                onChange={(e) => setPastedSongs(e.target.value)}
                disabled={isBusy}
                className={cn(inputClass, 'resize-none font-mono text-xs')}
              />
              <div className="flex justify-end">
                <button type="submit" disabled={isBusy || !pastedSongs.trim()} className={primaryButtonClass}>
                  {progress && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{progress ? 'Adding…' : 'Add the rest'}</span>
                </button>
              </div>
            </form>
          )}

          {progress && <ProgressBar progress={progress} />}

          {summary.unmatched.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-neutral-300">Not found on JioSaavn ({summary.unmatched.length})</p>
              <ul className="max-h-48 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs">
                {summary.unmatched.map((t, i) => (
                  <li key={i} className="truncate py-1 text-neutral-400">
                    <span className="text-white">{t.title}</span>
                    {t.artist && ` · ${t.artist}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogActions onCancel={onClose} cancelLabel="Close" cancelDisabled={isBusy}>
            <button type="button" disabled={isBusy} onClick={() => openPlaylist(summary.playlist.id)} className={primaryButtonClass}>
              Open playlist
            </button>
          </DialogActions>
        </div>
      ) : mode === 'screenshots' ? (
        <form key="screenshots" onSubmit={handleScreenshots} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="screenshot-files" className="text-xs font-semibold text-neutral-300">
              Screenshots <span className="text-brand-400">*</span>
            </label>
            <input
              id="screenshot-files"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              disabled={isBusy}
              onChange={(e) => setScreenshots(Array.from(e.target.files ?? []))}
              className={cn(
                inputClass,
                'file:mr-3 file:rounded-full file:border-0 file:bg-neutral-800 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white'
              )}
            />
            <p className="text-[11px] leading-relaxed text-neutral-500">
              Open the playlist in any music app and screenshot it, scrolling a bit less than a full screen each time, or
              take one scrolling screenshot. Song names are read automatically and matched on JioSaavn.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="screenshot-title" className="text-xs font-semibold text-neutral-300">
              Playlist name <span className="text-xs font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="screenshot-title"
              type="text"
              placeholder="Imported playlist"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={isBusy}
              className={inputClass}
            />
          </div>
          {progress && <ProgressBar progress={progress} />}
          <div className="pt-2">
            <DialogActions onCancel={onClose} cancelDisabled={isBusy}>
              <button type="submit" disabled={isBusy || screenshots.length === 0} className={primaryButtonClass}>
                {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {isBusy
                    ? 'Importing…'
                    : screenshots.length > 1
                      ? `Import ${screenshots.length} screenshots`
                      : 'Import'}
                </span>
              </button>
            </DialogActions>
          </div>
        </form>
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
              The playlist must be public. Songs are matched on JioSaavn, which takes a few seconds. Over 100 songs?
              You&rsquo;ll be shown how to add the rest.
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

function ProgressBar({ progress }: { progress: Progress }) {
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="space-y-1.5" role="status" aria-live="polite">
      <div className="flex justify-between text-[11px] text-neutral-400">
        <span>{progress.label}…</span>
        <span>
          {progress.done} / {progress.total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
        <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
