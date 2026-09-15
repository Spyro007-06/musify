'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { MobileNav } from './mobile-nav';
import { MobileDrawer } from './mobile-drawer';
import { GlobalPlayer } from '@/components/player/global-player';
import { cn } from '@/lib/utils/cn';

export interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn('flex h-screen w-full flex-col overflow-hidden bg-black text-white', className)}>
      {/* 1. Header / Topbar */}
      <Topbar />

      {/* 2. Middle Row: Sidebar + Scrollable Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="hidden md:flex shrink-0" />
        <main
          role="main"
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 md:p-6 pb-28 md:pb-6 focus:outline-none"
        >
          {children}
        </main>
      </div>

      {/* 3. Bottom: Global Audio Player */}
      <GlobalPlayer />

      {/* 4. Mobile Bottom Navigation (< md) */}
      <MobileNav />

      {/* 5. Mobile Drawer for overflow navigation items */}
      <MobileDrawer />
    </div>
  );
}
