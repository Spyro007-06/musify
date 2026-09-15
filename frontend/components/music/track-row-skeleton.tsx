import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

export function TrackRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg p-2.5 space-x-4 bg-neutral-900/30 border border-white/[0.03]',
        className
      )}
    >
      <div className="flex items-center gap-3 w-full">
        <Skeleton className="h-4 w-4 rounded shrink-0 bg-neutral-800/60" />
        <Skeleton className="h-10 w-10 shrink-0 rounded-md bg-neutral-800/80" />
        <div className="space-y-1.5 flex-1 max-w-xs">
          <Skeleton className="h-4 w-3/4 rounded bg-neutral-800/80" />
          <Skeleton className="h-3 w-1/2 rounded bg-neutral-800/50" />
        </div>
      </div>
      <Skeleton className="h-3 w-10 rounded shrink-0 bg-neutral-800/50" />
    </div>
  );
}
