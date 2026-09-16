'use client';

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackRowSkeleton } from '@/components/music/track-row-skeleton';
import { AlbumCardSkeleton } from '@/components/music/album-card-skeleton';

export function ArtistPageSkeleton() {
  return (
    <div className="space-y-12 animate-pulse">
      {/* Hero Skeleton */}
      <div className="relative -mx-4 -mt-6 sm:-mx-8 sm:-mt-8 p-6 sm:p-12 md:p-16 rounded-b-3xl bg-neutral-900/40 border-b border-white/5">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 max-w-7xl mx-auto">
          {/* Circular avatar */}
          <Skeleton className="h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 rounded-full shrink-0 bg-neutral-800" />

          {/* Meta text */}
          <div className="flex-1 space-y-4 text-center md:text-left w-full">
            <Skeleton className="h-4 w-28 mx-auto md:mx-0 rounded-full bg-neutral-800" />
            <Skeleton className="h-12 sm:h-16 w-3/4 max-w-md mx-auto md:mx-0 rounded-lg bg-neutral-800" />
            <Skeleton className="h-4 w-48 mx-auto md:mx-0 rounded-full bg-neutral-800" />

            {/* Action buttons */}
            <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
              <Skeleton className="h-12 w-28 rounded-full bg-neutral-800" />
              <Skeleton className="h-12 w-28 rounded-full bg-neutral-800" />
              <Skeleton className="h-12 w-12 rounded-full bg-neutral-800" />
              <Skeleton className="h-12 w-12 rounded-full bg-neutral-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Tracks Section Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36 rounded-md bg-neutral-800" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Discography Section Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-40 rounded-md bg-neutral-800" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <AlbumCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Related Artists Section Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-44 rounded-md bg-neutral-800" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-xl bg-neutral-900/40 p-4 border border-white/5 space-y-3"
            >
              <Skeleton className="h-32 w-32 rounded-full bg-neutral-800" />
              <Skeleton className="h-4 w-24 rounded bg-neutral-800" />
              <Skeleton className="h-3 w-12 rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
