'use client';

import * as React from 'react';
import { Radio } from 'lucide-react';
import { useAlbums } from '@/hooks/use-album';
import { useCategories } from '@/hooks/use-music';
import { AlbumCard } from '@/components/music/album-card';
import { CategoryCard } from '@/components/music/category-card';
import { MusicSection } from '@/components/music/music-section';

export default function BrowsePage() {
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

  return (
    <div className="space-y-12 pb-16">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
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

      {/* 1. Catalog Albums */}
      <MusicSection
        title="Featured & New Releases"
        subtitle={albums.length > 0 ? `${albums.length} releases` : undefined}
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
