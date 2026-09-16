'use client';

import * as React from 'react';
import Link from 'next/link';
import { ListMusic, Plus, AlertCircle, RefreshCw, Compass, Sparkles } from 'lucide-react';
import { usePlaylists } from '@/hooks/use-playlists';
import { PlaylistCard } from '@/components/music/playlist-card';
import { Skeleton } from '@/components/ui/skeleton';
import { CreatePlaylistModal } from '@/components/playlist/create-playlist-modal';

export default function PlaylistsPage() {
  const { data: playlists, isLoading, isError, error, refetch } = usePlaylists();
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  const hasPlaylists = Boolean(playlists && playlists.length > 0);

  // Group into user's custom playlists and soundtrack compilations
  const { customPlaylists, soundtrackPlaylists } = React.useMemo(() => {
    if (!playlists) return { customPlaylists: [], soundtrackPlaylists: [] };
    const custom = playlists.filter(
      (p) => !p.id.startsWith('movie-') && p.owner !== 'Movie Soundtrack'
    );
    const soundtracks = playlists.filter(
      (p) => p.id.startsWith('movie-') || p.owner === 'Movie Soundtrack'
    );
    return { customPlaylists: custom, soundtrackPlaylists: soundtracks };
  }, [playlists]);

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header with Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Your Playlists
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400">
            Playlists created by you and curated soundtrack collections.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-950/40 shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* 2. Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`playlist-skel-${i}`}
              className="space-y-3 rounded-xl bg-neutral-900/40 p-3 border border-white/5"
            >
              <Skeleton className="aspect-square w-full rounded-lg bg-neutral-800" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-3/4 bg-neutral-800 rounded" />
                <Skeleton className="h-3 w-1/2 bg-neutral-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Error State */}
      {isError && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-950/10 p-10 text-center">
          <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
          <h3 className="text-base font-semibold text-white">Failed to load playlists</h3>
          <p className="mt-1 text-xs text-neutral-400 max-w-sm">
            {error?.message || 'A network error occurred while retrieving your playlists.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* 4. Empty State */}
      {!isLoading && !isError && !hasPlaylists && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/80 text-neutral-500 mb-4">
            <ListMusic className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-white">No playlists created yet</h3>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400 max-w-md">
            Create custom playlists to organize and curate your favorite music into personal collections.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-black hover:bg-emerald-400 transition-colors shadow-lg"
            >
              <Plus className="h-4 w-4" />
              <span>Create Playlist</span>
            </button>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <Compass className="h-4 w-4" />
              <span>Explore Music</span>
            </Link>
          </div>
        </div>
      )}

      {/* 5. Custom Playlists Section */}
      {!isLoading && !isError && customPlaylists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white tracking-tight">Personal Playlists</h2>
            <span className="text-xs text-neutral-500">{customPlaylists.length} playlists</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {customPlaylists.map((playlist) => (
              <PlaylistCard key={`playlist-${playlist.id}`} playlist={playlist} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Soundtracks Section (Dynamic compilation playlists) */}
      {!isLoading && !isError && soundtrackPlaylists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Soundtracks & Curations</span>
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              </h2>
              <p className="text-xs text-neutral-400">
                Movie sound collections automatically compiled from your listening history
              </p>
            </div>
            <span className="text-xs text-neutral-500">{soundtrackPlaylists.length} albums</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {soundtrackPlaylists.map((playlist) => (
              <PlaylistCard key={`soundtrack-${playlist.id}`} playlist={playlist} />
            ))}
          </div>
        </section>
      )}

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
