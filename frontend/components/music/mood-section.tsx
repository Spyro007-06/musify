'use client';

import * as React from 'react';
import { useMood } from '@/hooks/use-music';
import { PlaylistCard } from './playlist-card';
import { AlbumCardSkeleton } from './album-card-skeleton';
import { cn } from '@/lib/utils/cn';
import { AlertCircle, RefreshCw, Smile } from 'lucide-react';
import { Playlist } from '@/types/playlist';

const MOODS = [
  { id: 'chill', label: 'Chill & Relax' },
  { id: 'workout', label: 'Workout Energy' },
  { id: 'focus', label: 'Focus & Study' },
  { id: 'party', label: 'Party Vibes' },
  { id: 'romance', label: 'Romance' },
];

export interface MoodSectionProps {
  onPlayPlaylist?: (playlist: Playlist) => void;
  className?: string;
}

export function MoodSection({ onPlayPlaylist, className }: MoodSectionProps) {
  const [selectedMood, setSelectedMood] = React.useState<string>('chill');
  const { data: playlists, isLoading, isError, error, refetch } = useMood(selectedMood);

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Moods & Vibes</h2>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">
            Handcrafted playlists matching your current headspace
          </p>
        </div>

        {/* Mood Selector Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MOODS.map((mood) => {
            const isSelected = selectedMood === mood.id;
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => setSelectedMood(mood.id)}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 select-none',
                  isSelected
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                    : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-white/5'
                )}
              >
                {mood.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Playlists Display */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <AlbumCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-rose-500/20 bg-rose-950/10 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
          <p className="text-sm font-medium text-rose-200">Unable to load mood playlists</p>
          <p className="mt-1 text-xs text-rose-300/70 max-w-sm">
            {(error as Error)?.message || 'Please check your connection and try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-500/20 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : !playlists || playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800/60 bg-neutral-900/30 p-8 text-center">
          <Smile className="h-8 w-8 text-neutral-500 mb-2" />
          <p className="text-sm text-neutral-400">No playlists found for this mood.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {playlists.slice(0, 5).map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onPlay={onPlayPlaylist}
            />
          ))}
        </div>
      )}
    </section>
  );
}
