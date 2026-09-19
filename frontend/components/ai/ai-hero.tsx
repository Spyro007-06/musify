'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, Wand2, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function AiHero({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-950/60 via-neutral-900 to-accent-950/40 p-6 sm:p-10 border border-accent-800/30 shadow-2xl',
        className
      )}
    >
      {/* Ambient background glow */}
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-accent-600/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl space-y-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-500/10 px-3.5 py-1 text-xs font-semibold text-accent-300 border border-accent-500/20">
          <Sparkles className="h-3.5 w-3.5 text-accent-400" />
          <span>MUSIFY Intelligence Studio</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
          AI-Powered Sound & Curation
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-2xl">
          Transform your natural language prompts into custom playlists and explore dynamic track recommendations.
        </p>

        {/* Quick action navigation pills */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/ai/playlist"
            className="inline-flex items-center gap-2 rounded-full bg-accent-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-accent-950/50 hover:bg-accent-700 hover:scale-105 active:scale-95 transition-all"
          >
            <Wand2 className="h-4 w-4" />
            AI Playlist Generator
          </Link>
          <a
            href="#ai-recommendations"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900/80 px-4 py-2.5 text-xs sm:text-sm font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <Music2 className="h-4 w-4" />
            Mood Recommendations
          </a>
        </div>
      </div>
    </div>
  );
}
