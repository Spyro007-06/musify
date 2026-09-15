'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export function AiPlaylistGenerator({ className }: { className?: string }) {
  const [prompt, setPrompt] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className={cn('rounded-xl border border-neutral-800 bg-neutral-900/60 p-6', className)}>
      <h3 className="text-xl font-bold text-white mb-2">Prompt-to-Playlist</h3>
      <p className="text-xs text-neutral-400 mb-4">
        Describe a vibe, storyline, or scenario, and our AI will build a personalized playlist.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Late night drive through Tokyo rain..."
          className="flex-1 rounded-lg bg-neutral-800 px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
        >
          Generate
        </button>
      </form>
    </div>
  );
}
