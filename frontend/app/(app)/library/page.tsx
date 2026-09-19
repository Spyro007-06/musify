'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart, History, ListMusic, Play, ArrowRight } from 'lucide-react';
import { useLikedSongs, useRecentlyPlayed } from '@/hooks/use-music';
import { usePlaylists } from '@/hooks/use-playlists';
import { usePlayerStore } from '@/stores/player-store';
import { MusicSection } from '@/components/music/music-section';
import { TrackRow } from '@/components/music/track-row';
import { PlaylistCard } from '@/components/music/playlist-card';
import { Track } from '@/types/track';
import { cn } from '@/lib/utils/cn';
import { pluralize } from '@/lib/utils/pluralize';

export default function LibraryPage() {
  const playTrack = usePlayerStore((s) => s.playTrack);

  const {
    data: likedSongs,
    isLoading: isLikedLoading,
    isError: isLikedError,
    error: likedError,
    refetch: refetchLiked,
  } = useLikedSongs(1, 10);

  const {
    data: recentlyPlayed,
    isLoading: isRecentLoading,
    isError: isRecentError,
    error: recentError,
    refetch: refetchRecent,
  } = useRecentlyPlayed(1, 10);

  const {
    data: playlists,
    isLoading: isPlaylistsLoading,
    isError: isPlaylistsError,
    error: playlistsError,
    refetch: refetchPlaylists,
  } = usePlaylists();

  const handlePlayLiked = (track: Track) => {
    playTrack(track, likedSongs || [track]);
  };

  const handlePlayRecent = (track: Track) => {
    playTrack(track, recentlyPlayed || [track]);
  };

  const handlePlayAllLiked = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (likedSongs && likedSongs.length > 0) {
      playTrack(likedSongs[0], likedSongs);
    }
  };

  const handlePlayAllRecent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (recentlyPlayed && recentlyPlayed.length > 0) {
      playTrack(recentlyPlayed[0], recentlyPlayed);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* 1. Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Your Library
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400">
          Your collection of liked songs, playlists, and listening history.
        </p>
      </div>

      {/* 2. Quick Navigation Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Liked Songs Tile */}
        <Link
          href="/library/liked"
          className={cn(
            'group relative overflow-hidden rounded-2xl p-5 border border-accent-500/20',
            'bg-gradient-to-br from-indigo-950/50 via-neutral-900/60 to-black',
            'hover:border-accent-500/40 hover:from-indigo-950/70 transition-all duration-300 shadow-lg select-none'
          )}
        >
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-accent-500/10 blur-2xl group-hover:bg-accent-500/20 transition-all" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-indigo-600 text-white shadow-md shadow-accent-950/50">
                <Heart className="h-6 w-6 fill-current" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white group-hover:text-accent-300 transition-colors">
                  Liked Songs
                </h2>
                <p className="text-xs text-neutral-400">
                  {likedSongs ? pluralize(likedSongs.length, 'track') : 'Favorite tracks'}
                </p>
              </div>
            </div>

            {likedSongs && likedSongs.length > 0 ? (
              <button
                type="button"
                onClick={handlePlayAllLiked}
                aria-label="Play all liked songs"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </button>
            ) : (
              <ArrowRight className="h-4 w-4 text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            )}
          </div>
        </Link>

        {/* Recently Played Tile */}
        <Link
          href="/library/recently-played"
          className={cn(
            'group relative overflow-hidden rounded-2xl p-5 border border-brand-500/20',
            'bg-gradient-to-br from-brand-950/50 via-neutral-900/60 to-black',
            'hover:border-brand-500/40 hover:from-brand-950/70 transition-all duration-300 shadow-lg select-none'
          )}
        >
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-brand-500/10 blur-2xl group-hover:bg-brand-500/20 transition-all" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 text-black shadow-md shadow-brand-950/50">
                <History className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white group-hover:text-brand-300 transition-colors">
                  Recently Played
                </h2>
                <p className="text-xs text-neutral-400">
                  {recentlyPlayed ? pluralize(recentlyPlayed.length, 'track') : 'Listening history'}
                </p>
              </div>
            </div>

            {recentlyPlayed && recentlyPlayed.length > 0 ? (
              <button
                type="button"
                onClick={handlePlayAllRecent}
                aria-label="Play all recently played tracks"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-black shadow-lg opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </button>
            ) : (
              <ArrowRight className="h-4 w-4 text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
            )}
          </div>
        </Link>

        {/* Playlists Tile */}
        <Link
          href="/library/playlists"
          className={cn(
            'group relative overflow-hidden rounded-2xl p-5 border border-amber-500/20',
            'bg-gradient-to-br from-amber-950/50 via-neutral-900/60 to-black',
            'hover:border-amber-500/40 hover:from-amber-950/70 transition-all duration-300 shadow-lg select-none'
          )}
        >
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-black shadow-md shadow-amber-950/50">
                <ListMusic className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors">
                  Playlists
                </h2>
                <p className="text-xs text-neutral-400">
                  {playlists ? pluralize(playlists.length, 'playlist') : 'Curated collections'}
                </p>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>

      {/* 3. Recently Played Section */}
      <MusicSection
        title="Recently Played"
        subtitle="Tracks you've listened to recently"
        seeAllHref="/library/recently-played"
        isLoading={isRecentLoading}
        isError={isRecentError}
        error={recentError}
        onRetry={refetchRecent}
        isEmpty={!recentlyPlayed || recentlyPlayed.length === 0}
        emptyMessage="Tracks you stream will appear here. Listen to music across MUSIFY to build your listening history."
        skeletonType="row"
        skeletonCount={6}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {recentlyPlayed?.slice(0, 6).map((track, i) => (
            <TrackRow
              key={`recent-${track.id}-${i}`}
              track={track}
              index={i}
              onPlay={handlePlayRecent}
            />
          ))}
        </div>
      </MusicSection>

      {/* 4. Liked Songs Section */}
      <MusicSection
        title="Liked Songs"
        subtitle="Your favorite songs in one place"
        seeAllHref="/library/liked"
        isLoading={isLikedLoading}
        isError={isLikedError}
        error={likedError}
        onRetry={refetchLiked}
        isEmpty={!likedSongs || likedSongs.length === 0}
        emptyMessage="No liked tracks yet. Tap the heart icon on any song to add it to your library."
        skeletonType="row"
        skeletonCount={6}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {likedSongs?.slice(0, 6).map((track, i) => (
            <TrackRow
              key={`liked-${track.id}-${i}`}
              track={track}
              index={i}
              onPlay={handlePlayLiked}
            />
          ))}
        </div>
      </MusicSection>

      {/* 5. Playlists Section */}
      <MusicSection
        title="Your Playlists"
        subtitle="Playlists you've created and curated sound collections"
        seeAllHref="/library/playlists"
        isLoading={isPlaylistsLoading}
        isError={isPlaylistsError}
        error={playlistsError}
        onRetry={refetchPlaylists}
        isEmpty={!playlists || playlists.length === 0}
        emptyMessage="You don't have any playlists yet."
        skeletonCount={6}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {playlists?.slice(0, 6).map((playlist) => (
            <PlaylistCard key={`playlist-${playlist.id}`} playlist={playlist} />
          ))}
        </div>
      </MusicSection>
    </div>
  );
}
