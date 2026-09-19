'use client';

import * as React from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Sparkles } from 'lucide-react';

export function HomeHeader() {
  const { user } = useCurrentUser();

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = user?.displayName || user?.username || 'Music Lover';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-950 via-neutral-900 to-neutral-900 p-6 sm:p-8 border border-brand-400/15">
      {/* Background glow accent */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-400 border border-brand-500/20">
              <Sparkles className="h-3 w-3" />
              <span>Personalized For You</span>
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            {greeting}, <span className="text-brand-400">{displayName}</span>
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-neutral-300 max-w-lg">
            Discover trending tracks, explore new releases, and vibe to handpicked playlists crafted for every mood.
          </p>
        </div>
      </div>
    </div>
  );
}
