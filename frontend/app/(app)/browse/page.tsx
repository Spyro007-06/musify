'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Radio, X } from 'lucide-react';
import { useAlbums } from '@/hooks/use-album';
import { useCategories, useTrending } from '@/hooks/use-music';
import { AlbumCard } from '@/components/music/album-card';
import { CategoryCard } from '@/components/music/category-card';
import { MusicSection } from '@/components/music/music-section';
import { TrackCard } from '@/components/music/track-card';
import { pluralize } from '@/lib/utils/pluralize';
import { usePlayerStore } from '@/stores/player-store';
import { Track } from '@/types/track';

function BrowsePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const genre = searchParams.get('genre') || undefined;
  const playTrack = usePlayerStore((s) => s.playTrack);

  const {
    data: albums = [],
    isLoading: isAlbumsLoading,
    isError: isAlbumsError,
    error: albumsError,
    refetch: refetchAlbums,
  } = useAlbums(1);
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories();
  const {
    data: genreTracks = [],
    isLoading: isGenreLoading,
    isError: isGenreError,
    error: genreError,
    refetch: refetchGenre,
  } = useTrending(genre);

  const genreLabel = categories.find((c) => c.id === genre)?.name || genre;

  const handlePlayGenreTrack = React.useCallback(
    (track: Track) => {
      playTrack(track, genreTracks);
    },
    [playTrack, genreTracks]
  );

  return (
    <div className="space-y-12 pb-16">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold uppercase tracking-wider">
          <Radio className="h-4 w-4" />
          Music Catalog
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          Browse
        </h1>
        <p className="text-sm text-neutral-400 max-w-lg">
          Explore the latest albums, new releases, and curated genres from our catalog.
        </p>
      </div>

      {/* 0. Genre filter results (only when a Genres & Moods card was clicked) */}
      {genre && (
        <MusicSection
          title={genreLabel || genre}
          subtitle={genreTracks.length > 0 ? pluralize(genreTracks.length, 'track') : undefined}
          isLoading={isGenreLoading}
          isError={isGenreError}
          error={genreError}
          onRetry={() => refetchGenre()}
          isEmpty={genreTracks.length === 0}
          emptyMessage="No tracks found for this genre right now."
          skeletonType="card"
          skeletonCount={6}
        >
          <div className="flex items-center justify-between -mt-2 mb-2">
            <button
              type="button"
              onClick={() => router.push('/browse')}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800/80 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear filter
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {genreTracks.map((track) => (
              <TrackCard key={track.id} track={track} onPlay={handlePlayGenreTrack} />
            ))}
          </div>
        </MusicSection>
      )}

      {/* 1. Catalog Albums */}
      <MusicSection
        title="Featured & New Releases"
        subtitle={albums.length > 0 ? pluralize(albums.length, 'release') : undefined}
        isLoading={isAlbumsLoading}
        isError={isAlbumsError}
        error={albumsError}
        onRetry={() => refetchAlbums()}
        isEmpty={albums.length === 0}
        emptyMessage="No catalog releases found at this moment."
        skeletonType="album"
        skeletonCount={12}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      </MusicSection>

      {/* 2. Genres & Categories */}
      <MusicSection
        title="Genres & Moods"
        isLoading={isCategoriesLoading}
        isError={isCategoriesError}
        error={categoriesError}
        onRetry={() => refetchCategories()}
        isEmpty={categories.length === 0}
        emptyMessage="No categories available."
        skeletonType="category"
        skeletonCount={4}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </MusicSection>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <React.Suspense fallback={null}>
      <BrowsePageContent />
    </React.Suspense>
  );
}
