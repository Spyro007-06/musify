'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Wand2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AiHero } from '@/components/ai/ai-hero';
import { AiRecommendations } from '@/components/ai/ai-recommendations';

export default function AiStudioPage() {
  return (
    <div className="space-y-12 pb-16">
      {/* 1. Hero Hub Header */}
      <AiHero />

      {/* 2. Primary Feature Grid Cards */}
      <section aria-labelledby="ai-features-heading" className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          <Sparkles className="h-4 w-4 text-accent-400" />
          <span>Intelligent Tools</span>
        </div>
        <h2 id="ai-features-heading" className="text-2xl font-bold tracking-tight text-white">
          Explore AI Studio Features
        </h2>

        <div className="grid grid-cols-1">
          {/* AI Playlist Card */}
          <Link
            href="/ai/playlist"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-accent-950/40 via-neutral-900 to-neutral-900 p-8 border border-accent-800/30 hover:border-accent-500/50 hover:shadow-2xl hover:shadow-accent-950/40 transition-all duration-300 select-none"
          >
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500/20 text-accent-300 border border-accent-500/30 group-hover:scale-110 group-hover:bg-accent-500 group-hover:text-black transition-all">
                <Wand2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-accent-300 transition-colors">
                AI Playlist Generator
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Describe a mood, era, genre, or favorite artist. Our rule-based AI assembles and saves an authoritative playlist directly into your library.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-accent-400 group-hover:text-accent-300">
              <span>Open Playlist Studio</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* 3. Real-time Mood & Vibe Recommendations */}
      <AiRecommendations />
    </div>
  );
}
