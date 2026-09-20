'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Music2,
  Disc3,
  Users,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import {
  useArtist,
  useArtistTopTracks,
  useArtistAlbums,
  useRelatedArtists,
} from '@/hooks/use-artist';
import { usePlayerStore } from '@/stores/player-store';
import { ArtistHero } from '@/components/artist/artist-hero';
import { ArtistPageSkeleton } from '@/components/artist/artist-page-skeleton';
import { TrackRow } from '@/components/music/track-row';
import { AlbumCard } from '@/components/music/album-card';
import { ArtistCard } from '@/components/music/artist-card';
import { Track } from '@/types/track';

import { ApiError } from '@/types/api';

interface ArtistPageProps {
  params: Promise<{ id: string }>;
}

export default function ArtistPage({ params }: ArtistPageProps) {
  const { id: artistId } = React.use(params);

  const playTrack = usePlayerStore((s) => s.playTrack);

  const {
    data: artist,
    isLoading: isArtistLoading,
    isError: isArtistError,
    error: artistError,
    refetch: refetchArtist,
  } = useArtist(artistId);

  const {
    data: topTracks = [],
    isLoading: isTopTracksLoading,
    refetch: refetchTopTracks,
  } = useArtistTopTracks(artistId);

  const {
    data: albums = [],
    isLoading: isAlbumsLoading,
  } = useArtistAlbums(artistId);

  const {
    data: relatedArtists = [],
    isLoading: isRelatedLoading,
  } = useRelatedArtists(artistId);

  const [showAllTracks, setShowAllTracks] = React.useState(false);

  // Play handler with full top tracks queue context
  const handlePlayTrack = React.useCallback(
    (track: Track) => {
      playTrack(track, topTracks);
    },
    [playTrack, topTracks]
  );

  // Loading state
  if (isArtistLoading) {
    return <ArtistPageSkeleton />;
  }

  // Check for 404 or Not Found error
  const isNotFound =
    (artistError instanceof ApiError && artistError.status === 404) ||
    artistError?.message?.toLowerCase().includes('not found');

  if (isNotFound) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-900 border border-white/10 mb-6">
          <Music2 className="h-10 w-10 text-neutral-500" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Artist Not Found
        </h1>
        <p className="text-sm text-neutral-400 max-w-md mb-8">
          The artist profile you are looking for doesn&apos;t exist or could not be located in our music catalog.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 text-black font-semibold text-sm hover:bg-brand-400 transition-colors shadow-lg shadow-brand-950/40"
          >
            <Search className="h-4 w-4" />
            Search Artists
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 border border-white/10 text-white font-semibold text-sm hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // Generic Error state
  if (isArtistError || !artist) {
    return (
      <ErrorState
        size="full"
        title="Failed to Load Artist"
        message={artistError?.message || 'A network error occurred while loading this artist profile.'}
        onRetry={() => {
          refetchArtist();
          refetchTopTracks();
        }}
      />
    );
  }

  // Display top 5 or all tracks
  const displayedTracks = showAllTracks ? topTracks : topTracks.slice(0, 5);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Hero Header */}
      <ArtistHero artist={artist} topTracks={topTracks} />

      {/* 2. Popular / Top Tracks Section */}
      <section aria-labelledby="top-tracks-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="top-tracks-heading"
            className="text-xl sm:text-2xl font-bold text-white tracking-tight"
          >
            Popular Tracks
          </h2>
          {topTracks.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllTracks(!showAllTracks)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              {showAllTracks ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>See all {topTracks.length}</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>

        {isTopTracksLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-neutral-900/40 border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : topTracks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/30 p-8 text-center">
            <Music2 className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">
              No top tracks found for this artist.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayedTracks.map((track, idx) => (
              <TrackRow
                key={track.id}
                track={track}
                index={idx}
                onPlay={handlePlayTrack}
                showAlbum
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Discography / Albums Section */}
      <section aria-labelledby="discography-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="discography-heading"
            className="text-xl sm:text-2xl font-bold text-white tracking-tight"
          >
            Discography
          </h2>
          {albums.length > 0 && (
            <span className="text-xs text-neutral-400 font-medium">
              {albums.length} {albums.length === 1 ? 'release' : 'releases'}
            </span>
          )}
        </div>

        {isAlbumsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-neutral-900/40 border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/30 p-8 text-center">
            <Disc3 className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">
              No albums or singles found for this artist.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Fans Also Like / Related Artists Section */}
      <section aria-labelledby="related-artists-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="related-artists-heading"
            className="text-xl sm:text-2xl font-bold text-white tracking-tight"
          >
            Fans Also Like
          </h2>
        </div>

        {isRelatedLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-xl bg-neutral-900/40 border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : relatedArtists.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/30 p-8 text-center">
            <Users className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">
              No similar artists found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {relatedArtists.map((relArtist) => (
              <ArtistCard key={relArtist.id} artist={relArtist} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
