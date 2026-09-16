'use client';

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TrackRowSkeleton } from '@/components/music/track-row-skeleton';

export function AlbumPageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Hero Skeleton */}
      <div className="relative -mx-4 -mt-6 sm:-mx-8 sm:-mt-8 p-6 sm:p-12 md:p-16 rounded-b-3xl bg-neutral-900/40 border-b border-white/5">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 max-w-7xl mx-auto">
          {/* Square artwork */}
          <Skeleton className="aspect-square w-44 sm:w-52 md:w-60 lg:w-64 rounded-2xl shrink-0 bg-neutral-800" />

          {/* Meta details */}
          <div className="flex-1 space-y-4 text-center sm:text-left w-full">
            <Skeleton className="h-5 w-20 mx-auto sm:mx-0 rounded-full bg-neutral-800" />
            <Skeleton className="h-10 sm:h-14 w-3/4 max-w-md mx-auto sm:mx-0 rounded-lg bg-neutral-800" />
            <Skeleton className="h-4 w-56 mx-auto sm:mx-0 rounded-full bg-neutral-800" />

            {/* Action buttons */}
            <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
              <Skeleton className="h-12 w-32 rounded-full bg-neutral-800" />
              <Skeleton className="h-12 w-12 rounded-full bg-neutral-800" />
              <Skeleton className="h-12 w-12 rounded-full bg-neutral-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Tracks Section Skeleton */}
      <div className="space-y-4">
        {/* Table header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2 px-4">
          <Skeleton className="h-4 w-12 bg-neutral-800" />
          <Skeleton className="h-4 w-16 bg-neutral-800" />
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
