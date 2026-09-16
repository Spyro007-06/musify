'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { AiPlaylistGenerator } from '@/components/ai/ai-playlist-generator';

export default function AiPlaylistPage() {
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
          <Wand2 className="h-4 w-4" />
          AI Creator
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
          AI Playlist Generator
        </h1>
        <p className="text-sm text-neutral-400 max-w-xl">
          Craft custom playlists on the fly from natural descriptions, themes, or musical memories.
        </p>
      </div>

      {/* Generator Component */}
      <AiPlaylistGenerator />
    </div>
  );
}
