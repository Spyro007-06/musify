'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/utils/cn';

/**
 * Derives a human-readable title from the current route pathname.
 */
function getPageTitle(pathname: string): string {
  if (pathname === '/home') return 'Home';
  if (pathname === '/search') return 'Search';
  if (pathname === '/discover') return 'Discover';
  if (pathname === '/browse') return 'Browse';
  if (pathname === '/library') return 'Your Library';
  if (pathname === '/library/liked') return 'Liked Songs';
  if (pathname === '/library/recently-played') return 'Recently Played';
  if (pathname === '/library/playlists') return 'Playlists';
  if (pathname.startsWith('/artists/')) return 'Artist Profile';
  if (pathname.startsWith('/albums/')) return 'Album';
  if (pathname.startsWith('/playlists/')) return 'Playlist';
  if (pathname === '/ai') return 'AI Studio';
  if (pathname === '/ai/playlist') return 'AI Playlist Generator';
  if (pathname === '/ai/lyrics') return 'Lyrics Analysis';
  if (pathname === '/profile') return 'Your Profile';
  if (pathname === '/settings') return 'Settings';
  return 'MUSIFY';
}

export function Topbar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const { toggleMobileMenu } = useUiStore();

  const title = getPageTitle(pathname);

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-neutral-800 bg-black/80 px-4 md:px-6 backdrop-blur-md',
        className
      )}
    >
      {/* Left: Mobile menu button & page context title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
          {title}
        </h1>
      </div>

      {/* Center: Search entry link (hidden on small mobile screens if on search page) */}
      <div className="hidden sm:flex items-center max-w-xs w-full mx-4">
        <Link
          href="/search"
          aria-label="Go to search"
          className="flex items-center gap-2.5 w-full rounded-full border border-neutral-800 bg-neutral-900/90 px-3.5 py-1.5 text-xs text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
        >
          <Search className="h-4 w-4 shrink-0 text-neutral-500" />
          <span className="truncate">Search songs, artists, albums...</span>
        </Link>
      </div>

      {/* Right: User area / guest auth buttons */}
      <div className="flex items-center gap-3">
        {isAuthenticated && user ? (
          <UserMenu user={user} />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname)}`}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href={`/signup?redirect=${encodeURIComponent(pathname)}`}
              className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
