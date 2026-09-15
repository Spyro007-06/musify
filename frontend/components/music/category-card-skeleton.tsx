import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

export function CategoryCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative h-32 w-full overflow-hidden rounded-xl bg-neutral-900/40 p-4 border border-white/5',
        className
      )}
    >
      <Skeleton className="h-5 w-1/2 rounded bg-neutral-800/80" />
      <Skeleton className="absolute -bottom-2 -right-2 h-20 w-20 rounded-md bg-neutral-800/40" />
    </div>
  );
}
