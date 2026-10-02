'use client';

import * as React from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import { useMood } from '@/hooks/use-music';
import { MusicSection } from '@/components/music/music-section';
import { PlaylistCard } from '@/components/music/playlist-card';
import { ShelfRow, ShelfItem } from '@/components/music/shelf-row';
import { Playlist } from '@/types/playlist';
import { sessionShuffle } from '@/lib/utils/session-shuffle';

export interface PlaylistShelfProps {
  title: string;
  result: UseQueryResult<Playlist[]>;
  onPlay?: (playlist: Playlist) => void;
}

/** One horizontal row of playlists from any playlist query — a different 10 of them each app open. */
export function PlaylistShelf({ title, result, onPlay }: PlaylistShelfProps) {
  const { data, isLoading, isError, error, refetch } = result;
  const shown = React.useMemo(() => sessionShuffle(data || []).slice(0, 10), [data]);
  // Spotify just drops a row with nothing in it rather than showing an empty state.
  if (!isLoading && !isError && shown.length === 0) return null;

  return (
    <MusicSection
      title={title}
      isLoading={isLoading}
      isError={isError}
      error={error as Error | null}
      onRetry={refetch}
      skeletonType="album"
      skeletonCount={6}
    >
      <ShelfRow>
        {shown.map((playlist) => (
          <ShelfItem key={playlist.id}>
            <PlaylistCard playlist={playlist} onPlay={onPlay} />
          </ShelfItem>
        ))}
      </ShelfRow>
    </MusicSection>
  );
}

export interface PlaylistRowProps {
  title: string;
  /** Search term for JioSaavn playlists (biased by the user's language/genre on the backend). */
  query: string;
  onPlay?: (playlist: Playlist) => void;
}

/** A row of editorial playlists for a search term, e.g. "Party". */
export function PlaylistRow({ title, query, onPlay }: PlaylistRowProps) {
  return <PlaylistShelf title={title} result={useMood(query)} onPlay={onPlay} />;
}
