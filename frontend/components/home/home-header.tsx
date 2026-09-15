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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900/60 to-neutral-900/30 p-6 sm:p-8 border border-white/5 shadow-2xl backdrop-blur-md">
      {/* Background glow accent */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-3 w-3" />
              <span>Personalized For You</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            {greeting}, <span className="text-emerald-400">{displayName}</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-lg">
            Discover trending tracks, explore new releases, and vibe to handpicked playlists crafted for every mood.
          </p>
        </div>
      </div>
    </div>
  );
}
