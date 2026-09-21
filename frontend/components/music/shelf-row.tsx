import { cn } from '@/lib/utils/cn';

export interface ShelfRowProps {
  children: React.ReactNode;
  className?: string;
}

/** Single-row horizontally-scrolling shelf of cards, Spotify-style. */
export function ShelfRow({ children, className }: ShelfRowProps) {
  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-1 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x', className)}>
      {children}
    </div>
  );
}

/** Fixed-width wrapper for a card inside a ShelfRow. */
export function ShelfItem({ children, className }: ShelfRowProps) {
  return <div className={cn('w-[150px] sm:w-[170px] shrink-0 snap-start', className)}>{children}</div>;
}
