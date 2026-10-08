'use client';

import * as React from 'react';
import { Loader2, MicVocal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { musicApi } from '@/lib/api/music';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';
import { TrackRow } from '@/components/music/track-row';
import { ApiError } from '@/types/api';

/**
 * "Find songs with these lyrics": a line you remember, maybe misspelled or
 * typed in Latin letters, goes to Gemini (via the backend), which names the
 * likely songs. Only on a tap: each search spends a shared AI quota.
 */
export function LyricSearch({ query }: { query: string }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const playFrom = usePlayerStore((s) => s.playFrom);
  const [asked, setAsked] = React.useState('');
  const found = useQuery({
    queryKey: ['music', 'lyrics-search', asked],
    queryFn: async () => (await musicApi.findByLyrics(asked)).data ?? [],
    enabled: Boolean(asked),
    staleTime: Infinity,
    retry: false,
  });

  if (!isAuthenticated || query.split(/\s+/).length < 3) return null;

  if (asked !== query) {
    return (
      <button
        type="button"
        onClick={() => setAsked(query)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
      >
        <MicVocal className="h-4 w-4 text-brand-400" />
        Find songs with these lyrics
      </button>
    );
  }

  return (
    <section className="space-y-2" aria-live="polite">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-300">
        <MicVocal className="h-4 w-4 text-brand-400" /> Songs with these lyrics
      </h2>
      {found.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking for the song…
        </p>
      ) : found.isError ? (
        <p className="text-sm text-neutral-400">
          {found.error instanceof ApiError && found.error.status === 503
            ? 'The lyrics helper is busy. Try again in a minute.'
            : "Couldn't search the lyrics right now."}{' '}
          <button type="button" onClick={() => found.refetch()} className="font-semibold text-white underline underline-offset-2">
            Try again
          </button>
        </p>
      ) : found.data && found.data.length > 0 ? (
        <div className="space-y-1">
          {found.data.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} onPlay={(t) => playFrom('Songs with these lyrics', t, found.data!)} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-400">No song found for those words. Try another line from it.</p>
      )}
    </section>
  );
}
