import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export function LyricsAnalyzer({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-neutral-800 bg-neutral-900/60 p-6', className)}>
      <h3 className="text-xl font-bold text-white mb-2">Lyrics & Vibe Analysis</h3>
      <p className="text-xs text-neutral-400">
        AI-driven lyrical breakdown, emotional depth scores, and themes.
      </p>
    </div>
  );
}
