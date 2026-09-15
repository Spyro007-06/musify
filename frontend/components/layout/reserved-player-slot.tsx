'use client';

import * as React from 'react';
import { Disc3 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function ReservedPlayerSlot({ className }: { className?: string }) {
  return (
    <div
      aria-label="Audio player slot"
      role="region"
      className={cn(
        'h-16 md:h-20 w-full border-t border-neutral-800/90 bg-neutral-950/95 px-4 md:px-6 flex items-center justify-between select-none z-30',
        className
      )}
    >
      {/* Left structural placeholder */}
      <div className="flex items-center gap-3 w-1/3 min-w-[140px]">
        <div
          aria-hidden="true"
          className="h-10 w-10 md:h-12 md:w-12 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600"
        >
          <Disc3 className="h-5 w-5 animate-spin-slow" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-24 rounded bg-neutral-800/60" />
          <div className="h-2.5 w-16 rounded bg-neutral-900" />
        </div>
      </div>

      {/* Center placeholder controls */}
      <div className="flex flex-col items-center gap-1.5 w-1/3 max-w-md">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-neutral-800" />
          <div className="h-7 w-7 rounded-full bg-neutral-800/80 border border-neutral-700/60" />
          <div className="h-2 w-2 rounded-full bg-neutral-800" />
        </div>
        <div className="h-1 w-full max-w-xs rounded-full bg-neutral-900" />
      </div>

      {/* Right placeholder volume/tools */}
      <div className="hidden sm:flex items-center justify-end gap-2 w-1/3 min-w-[120px]">
        <div className="h-1.5 w-20 rounded-full bg-neutral-900" />
      </div>
    </div>
  );
}
