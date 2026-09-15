import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export function AiHero({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/60 to-indigo-950 p-8 border border-purple-800/40',
        className
      )}
    >
      <h2 className="text-3xl font-extrabold text-white">MUSIFY AI Studio</h2>
      <p className="mt-2 max-w-xl text-sm text-purple-200/80">
        Generate custom playlists tailored to your mood, analyze lyrics and feelings, and explore soundscapes curated by artificial intelligence.
      </p>
    </div>
  );
}
