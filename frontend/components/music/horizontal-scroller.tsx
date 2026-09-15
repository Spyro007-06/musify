import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export function HorizontalScroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4 scrollbar-none', className)}>
      {children}
    </div>
  );
}
