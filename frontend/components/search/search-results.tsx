'use client';

import * as React from 'react';
import { SearchX, AlertCircle, RefreshCw } from 'lucide-react';
import { SearchResults as SearchResultsType } from '@/lib/api/search';
import { TrackRow } from '@/components/music/track-row';
import { ArtistCard } from '@/components/music/artist-card';
import { AlbumCard } from '@/components/music/album-card';
import { PlaylistCard } from '@/components/music/playlist-card';
import { TrackRowSkeleton } from '@/components/music/track-row-skeleton';
import { AlbumCardSkeleton } from '@/components/music/album-card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayerStore } from '@/stores/player-store';
import { Track } from '@/types/track';
import { cn } from '@/lib/utils/cn';

export interface SearchResultsProps {
  query: string;
  results: SearchResultsType | null;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onClear?: () => void;
  className?: string;
}

export function SearchResults({
  query,
  results,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  onClear,
  className,
}: SearchResultsProps) {
  const playTrack = usePlayerStore((s) => s.playTrack);

  const handlePlayTrack = (track: Track) => {
    playTrack(track, results?.tracks || [track]);
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className={cn('space-y-8 animate-in fade-in duration-200', className)}>
        {/* Songs Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-28 rounded bg-neutral-800" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <TrackRowSkeleton key={`skel-row-${i}`} />
            ))}
          </div>
        </div>

        {/* Artists Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-24 rounded bg-neutral-800" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-art-${i}`} className="flex flex-col items-center p-4 rounded-xl bg-neutral-900/40 space-y-3">
                <Skeleton className="aspect-square w-full rounded-full bg-neutral-800" />
                <Skeleton className="h-4 w-3/4 rounded bg-neutral-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Albums Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-24 rounded bg-neutral-800" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <AlbumCardSkeleton key={`skel-alb-${i}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <div role="alert" className={cn('flex flex-col items-center justify-center rounded-2xl border border-danger-500/20 bg-danger-950/10 p-10 text-center', className)}>
        <AlertCircle className="h-10 w-10 text-danger-400 mb-3" />
        <h3 className="text-lg font-bold text-white">Search request failed</h3>
        <p className="mt-1 text-sm text-neutral-400 max-w-sm">
          {error?.message || 'Something went wrong while fetching search results. Please try again.'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-black hover:bg-brand-400 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Search</span>
          </button>
        )}
      </div>
    );
  }

  if (!results) return null;

  const hasTracks = Boolean(results.tracks && results.tracks.length > 0);
  const hasArtists = Boolean(results.artists && results.artists.length > 0);
  const hasAlbums = Boolean(results.albums && results.albums.length > 0);
  const hasPlaylists = Boolean(results.playlists && results.playlists.length > 0);

  const hasAnyResults = hasTracks || hasArtists || hasAlbums || hasPlaylists;

  // 3. Empty State
  if (!hasAnyResults) {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-neutral-900/30 p-12 text-center', className)}>
        <SearchX className="h-12 w-12 text-neutral-500 mb-3" />
        <h3 className="text-lg font-bold text-white">No results found for &ldquo;{query}&rdquo;</h3>
        <p className="mt-1.5 text-sm text-neutral-400 max-w-md">
          Please check your spelling or try searching for another artist, song, album, or playlist.
        </p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-6 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            Clear Search
          </button>
        )}
      </div>
    );
  }

  // 4. Results State
  return (
    <div className={cn('space-y-10 animate-in fade-in duration-200', className)}>
      {/* Songs */}
      {hasTracks && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">Songs</h2>
            <span className="text-xs text-neutral-400 font-medium">
              {results.tracks.length} {results.tracks.length === 1 ? 'song' : 'songs'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {results.tracks.map((track, i) => (
              <TrackRow
                key={`search-track-${track.id}-${i}`}
                track={track}
                index={i}
                onPlay={handlePlayTrack}
              />
            ))}
          </div>
        </section>
      )}

      {/* Artists */}
      {hasArtists && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">Artists</h2>
            <span className="text-xs text-neutral-400 font-medium">
              {results.artists.length} {results.artists.length === 1 ? 'artist' : 'artists'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.artists.map((artist) => (
              <ArtistCard key={`search-artist-${artist.id}`} artist={artist} />
            ))}
          </div>
        </section>
      )}

      {/* Albums */}
      {hasAlbums && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">Albums</h2>
            <span className="text-xs text-neutral-400 font-medium">
              {results.albums.length} {results.albums.length === 1 ? 'album' : 'albums'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.albums.map((album) => (
              <AlbumCard key={`search-album-${album.id}`} album={album} />
            ))}
          </div>
        </section>
      )}

      {/* Playlists */}
      {hasPlaylists && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">Playlists</h2>
            <span className="text-xs text-neutral-400 font-medium">
              {results.playlists.length} {results.playlists.length === 1 ? 'playlist' : 'playlists'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.playlists.map((playlist) => (
              <PlaylistCard key={`search-playlist-${playlist.id}`} playlist={playlist} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
