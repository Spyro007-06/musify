'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { MobileNav } from './mobile-nav';
import { GlobalPlayer } from '@/components/player/global-player';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils/cn';

export interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  const hasTrack = Boolean(usePlayerStore((s) => s.currentTrack));

  return (
    <div className={cn('flex h-dvh w-full flex-col overflow-hidden bg-canvas text-neutral-50', className)}>
      {/* 1. Header / Topbar */}
      <Topbar />

      {/* 2. Middle Row: Sidebar + Scrollable Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="hidden md:flex shrink-0" />
        <main
          role="main"
          id="main-content"
          tabIndex={-1}
          className={cn(
            'min-w-0 flex-1 overflow-y-auto p-4 md:p-6 md:pb-6 focus:outline-none',
            hasTrack
              ? 'pb-[calc(8rem+env(safe-area-inset-bottom,0px))]'
              : 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]'
          )}
        >
          {children}
        </main>
      </div>

      {/* 3. Bottom: Global Audio Player */}
      <GlobalPlayer />

      {/* 4. Mobile Bottom Navigation (< md) */}
      <MobileNav />
    </div>
  );
}
