'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { LyricsAnalyzer } from '@/components/ai/lyrics-analyzer';

export default function AiLyricsPage() {
  return (
    <div className="space-y-8 pb-16">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/ai"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to AI Studio
        </Link>
      </div>

      {/* Page Title */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
          <FileText className="h-4 w-4" />
          Lyrical Insights
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          Lyrics &amp; Vibes Breakdown
        </h1>
        <p className="text-sm text-neutral-400 max-w-xl">
          Dive into poetic meanings, thematic storylines, and interesting trivia behind the songs you love.
        </p>
      </div>

      {/* Analyzer Component */}
      <LyricsAnalyzer />
    </div>
  );
}
