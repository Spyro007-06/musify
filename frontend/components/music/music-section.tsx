'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { TrackCardSkeleton } from './track-card-skeleton';
import { AlbumCardSkeleton } from './album-card-skeleton';
import { CategoryCardSkeleton } from './category-card-skeleton';
import { TrackRowSkeleton } from './track-row-skeleton';

export interface MusicSectionProps {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  skeletonType?: 'card' | 'album' | 'category' | 'row';
  skeletonCount?: number;
  children?: React.ReactNode;
  className?: string;
}

export function MusicSection({
  title,
  subtitle,
  seeAllHref,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  isEmpty = false,
  emptyMessage = 'No items available at this time.',
  skeletonType = 'card',
  skeletonCount = 6,
  children,
  className,
}: MusicSectionProps) {
  const renderSkeletons = () => {
    const items = Array.from({ length: skeletonCount });

    if (skeletonType === 'row') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (skeletonType === 'category') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (skeletonType === 'album') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((_, i) => (
            <AlbumCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((_, i) => (
          <TrackCardSkeleton key={i} />
        ))}
      </div>
    );
  };

  return (
    <section className={cn('space-y-4', className)}>
      {/* Section Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs sm:text-sm text-neutral-400 line-clamp-1">{subtitle}</p>
          )}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="group flex items-center gap-1 text-xs sm:text-sm font-semibold text-neutral-400 hover:text-brand-400 transition-colors"
          >
            <span>See all</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* States */}
      {isLoading ? (
        renderSkeletons()
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-xl border border-danger-500/20 bg-danger-950/10 p-8 text-center backdrop-blur-sm"
        >
          <AlertCircle className="h-8 w-8 text-danger-400 mb-2" />
          <p className="text-sm font-medium text-danger-200">Unable to load {title.toLowerCase()}</p>
          <p className="mt-1 text-xs text-danger-300/70 max-w-sm">
            {error?.message || 'Something went wrong while fetching data. Please try again.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-danger-500/20 px-3.5 py-2 text-xs font-semibold text-danger-300 hover:bg-danger-500/30 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      ) : isEmpty ? (
        <div
          aria-live="polite"
          className="flex flex-col items-center justify-center rounded-xl border border-neutral-800/60 bg-neutral-900/30 p-8 text-center"
        >
          <p className="text-sm text-neutral-400">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
