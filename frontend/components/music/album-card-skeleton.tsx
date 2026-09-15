import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

export function AlbumCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'group flex flex-col rounded-xl bg-neutral-900/40 p-3 border border-white/5 space-y-3',
        className
      )}
    >
      <Skeleton className="aspect-square w-full rounded-lg bg-neutral-800/70" />
      <div className="space-y-1.5 py-1">
        <Skeleton className="h-4 w-4/5 rounded bg-neutral-800/80" />
        <Skeleton className="h-3 w-1/3 rounded bg-neutral-800/50" />
      </div>
    </div>
  );
}
