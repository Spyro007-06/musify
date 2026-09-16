'use client';

import * as React from 'react';
import { Disc3, Compass, Radio } from 'lucide-react';
import { useAlbums } from '@/hooks/use-album';
import { useCategories } from '@/hooks/use-music';
import { AlbumCard } from '@/components/music/album-card';
import { AlbumCardSkeleton } from '@/components/music/album-card-skeleton';
import { CategoryCard } from '@/components/music/category-card';
import { CategoryCardSkeleton } from '@/components/music/category-card-skeleton';

export default function BrowsePage() {
  const { data: albums = [], isLoading: isAlbumsLoading } = useAlbums(1);
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();

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
      <section aria-labelledby="catalog-albums-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-emerald-400" />
            <h2
              id="catalog-albums-heading"
              className="text-xl sm:text-2xl font-bold text-white tracking-tight"
            >
              Featured & New Releases
            </h2>
          </div>
          {albums.length > 0 && (
            <span className="text-xs text-neutral-400 font-medium">
              {albums.length} releases
            </span>
          )}
        </div>

        {isAlbumsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <AlbumCardSkeleton key={i} />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/30 p-8 text-center">
            <Disc3 className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">
              No catalog releases found at this moment.
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

      {/* 2. Genres & Categories */}
      <section aria-labelledby="categories-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-emerald-400" />
          <h2
            id="categories-heading"
            className="text-xl sm:text-2xl font-bold text-white tracking-tight"
          >
            Genres & Moods
          </h2>
        </div>

        {isCategoriesLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/30 p-8 text-center">
            <Compass className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">
              No categories available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
