'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Disc3,
  Search,
  ArrowLeft,
  Clock,
  Radio,
} from 'lucide-react';
import { useAlbum } from '@/hooks/use-album';
import { usePlayerStore } from '@/stores/player-store';
import { AlbumHero } from '@/components/album/album-hero';
import { AlbumPageSkeleton } from '@/components/album/album-page-skeleton';
import { TrackRow } from '@/components/music/track-row';
import { ErrorState } from '@/components/ui/error-state';
import { ApiError } from '@/types/api';
import { Track } from '@/types/track';

interface AlbumPageProps {
  params: Promise<{ id: string }>;
}

export default function AlbumPage({ params }: AlbumPageProps) {
  const { id: albumId } = React.use(params);

  const playTrack = usePlayerStore((s) => s.playTrack);

  const {
    data: album,
    isLoading,
    isError,
    error,
    refetch,
  } = useAlbum(albumId);

  const tracks = React.useMemo(() => album?.tracks || [], [album?.tracks]);

  // Track playback handler: passes full album tracks collection as queue context
  const handlePlayTrack = React.useCallback(
    (track: Track) => {
      playTrack(track, tracks);
    },
    [playTrack, tracks]
  );

  // Loading state
  if (isLoading) {
    return <AlbumPageSkeleton />;
  }

  // 404 / Not Found state — also covers a "successful" response whose data
  // is actually blank (empty id/title/artist name). Seen live against the
  // real catalog: some album ids resolve to a malformed upstream entry
  // instead of a proper 404, which would otherwise render as a real album
  // with no title and an unplayable track.
  const isBlankAlbum = !!album && !album.id && !album.title && !album.artist?.name;
  const isNotFound =
    isBlankAlbum ||
    (error instanceof ApiError && error.status === 404) ||
    error?.message?.toLowerCase().includes('not found');

  if (isNotFound) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-900 border border-white/10 mb-6">
          <Disc3 className="h-10 w-10 text-neutral-500" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Album Not Found
        </h1>
        <p className="text-sm text-neutral-400 max-w-md mb-8">
          The album you are looking for does not exist, has been removed, or could not be found in the catalog.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 text-black font-semibold text-sm hover:bg-brand-400 transition-colors shadow-lg shadow-brand-950/40"
          >
            <Search className="h-4 w-4" />
            Search Music
          </Link>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 border border-white/10 text-white font-semibold text-sm hover:bg-neutral-800 transition-colors"
          >
            <Radio className="h-4 w-4" />
            Browse Catalog
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 border border-white/10 text-white font-semibold text-sm hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </div>
      </div>
    );
  }

  // Network / General Error state
  if (isError || !album) {
    return (
      <ErrorState
        size="full"
        title="Failed to Load Album"
        message={error?.message || 'A network error occurred while loading this album.'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Album Hero Header */}
      <AlbumHero album={album} />

      {/* 2. Track List Section */}
      <section aria-label="Album track list" className="space-y-4">
        {/* Table header row */}
        <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-2 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <span className="w-8 text-center">#</span>
          <span>Title</span>
          <span className="hidden sm:block" />
          <span className="flex items-center justify-end pr-2">
            <Clock className="h-4 w-4" />
          </span>
        </div>

        {/* Tracks List */}
        {tracks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/30 p-12 text-center">
            <Disc3 className="h-10 w-10 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">
              No tracks in this album
            </h3>
            <p className="text-sm text-neutral-400 max-w-sm mx-auto">
              This release currently does not have any playable songs available.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {tracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                onPlay={handlePlayTrack}
                showAlbum={false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
