'use client';

import * as React from 'react';
import Link from 'next/link';
import { Play, SearchX, Music2 } from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { SearchResults as SearchResultsType, TopResult } from '@/lib/api/search';
import { RecentSearch } from '@/hooks/use-recent-searches';
import { TrackRow } from '@/components/music/track-row';
import { ArtistCard } from '@/components/music/artist-card';
import { AlbumCard } from '@/components/music/album-card';
import { PlaylistCard } from '@/components/music/playlist-card';
import { ShelfRow, ShelfItem } from '@/components/music/shelf-row';
import { TrackRowSkeleton } from '@/components/music/track-row-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayerStore } from '@/stores/player-store';
import { Track } from '@/types/track';
import { Artist } from '@/types/artist';
import { Album } from '@/types/album';
import { Playlist } from '@/types/playlist';
import { cn } from '@/lib/utils/cn';

type Filter = 'all' | 'songs' | 'artists' | 'albums' | 'playlists';

const TYPE_LABEL: Record<TopResult['type'], string> = { song: 'Song', artist: 'Artist', album: 'Album', playlist: 'Playlist' };
const HREF: Record<Exclude<TopResult['type'], 'song'>, string> = { artist: '/artists/', album: '/albums/', playlist: '/playlists/' };

// What gets remembered in "Recent searches" when a result is opened.
const recentFromTrack = (t: Track): RecentSearch => ({
  type: 'song',
  id: t.id,
  title: t.title,
  subtitle: t.artists?.map((a) => a.name).join(', ') || '',
  image: t.artwork,
  track: t,
});
const recentFromArtist = (a: Artist): RecentSearch => ({ type: 'artist', id: a.id, title: a.name, subtitle: 'Artist', image: a.image });
const recentFromAlbum = (a: Album): RecentSearch => ({ type: 'album', id: a.id, title: a.title, subtitle: a.artist?.name || 'Album', image: a.artwork });
const recentFromPlaylist = (p: Playlist): RecentSearch => ({ type: 'playlist', id: p.id, title: p.title, subtitle: 'Playlist', image: p.cover });

export interface SearchResultsProps {
  query: string;
  results: SearchResultsType | null;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onClear?: () => void;
  /** Called when the user plays/opens a result, to record it as a recent search. */
  onPick?: (item: RecentSearch) => void;
  className?: string;
}

export function SearchResults({ query, results, isLoading = false, isError = false, error, onRetry, onClear, onPick, className }: SearchResultsProps) {
  const playFrom = usePlayerStore((s) => s.playFrom);
  const [filter, setFilter] = React.useState<Filter>('all');

  // A new query starts back on "All", like Spotify.
  React.useEffect(() => setFilter('all'), [query]);

  const playFromResults = (track: Track) => {
    playFrom(`"${query}" in Search`, track, results?.tracks?.some((t) => t.id === track.id) ? results.tracks : [track]);
    onPick?.(recentFromTrack(track));
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full bg-neutral-800" />
          ))}
        </div>
        <Skeleton className="h-40 w-full max-w-md rounded-xl bg-neutral-800" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <TrackRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className={className}
        title="Search request failed"
        message={error?.message || 'Something went wrong while fetching search results. Please try again.'}
        onRetry={onRetry}
        retryLabel="Retry Search"
      />
    );
  }

  if (!results) return null;

  const { tracks = [], artists = [], albums = [], playlists = [], top } = results;
  const available: { id: Filter; label: string; count: number }[] = [
    { id: 'songs', label: 'Songs', count: tracks.length },
    { id: 'artists', label: 'Artists', count: artists.length },
    { id: 'albums', label: 'Albums', count: albums.length },
    { id: 'playlists', label: 'Playlists', count: playlists.length },
  ];

  if (available.every((f) => f.count === 0) && !top) {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-neutral-900/30 p-12 text-center', className)}>
        <SearchX className="h-12 w-12 text-neutral-500 mb-3" />
        <h3 className="text-lg font-bold text-white">No results found for &ldquo;{query}&rdquo;</h3>
        <p className="mt-1.5 text-sm text-neutral-400 max-w-md">
          Please check your spelling or try searching for another artist, song, album, or playlist.
        </p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-6 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            Clear Search
          </button>
        )}
      </div>
    );
  }

  const heading = (text: string) => <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">{text}</h2>;

  const artistCard = (a: Artist) => (
    <div onClickCapture={() => onPick?.(recentFromArtist(a))}>
      <ArtistCard artist={a} />
    </div>
  );
  const albumCard = (a: Album) => (
    <div onClickCapture={() => onPick?.(recentFromAlbum(a))}>
      <AlbumCard album={a} />
    </div>
  );
  const playlistCard = (p: Playlist) => (
    <div onClickCapture={() => onPick?.(recentFromPlaylist(p))}>
      <PlaylistCard playlist={p} />
    </div>
  );

  return (
    <div className={cn('space-y-8 animate-in fade-in duration-200', className)}>
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none" role="tablist" aria-label="Filter results">
        {[{ id: 'all' as Filter, label: 'All', count: 1 }, ...available]
          .filter((f) => f.count > 0)
          .map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                filter === f.id ? 'bg-brand-500 text-black' : 'bg-white/[0.07] text-white hover:bg-white/[0.12]'
              )}
            >
              {f.label}
            </button>
          ))}
      </div>

      {filter === 'all' && (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            {top && (
              <section className="space-y-3">
                {heading('Top result')}
                <TopResultCard top={top} onPlay={playFromResults} onPick={onPick} />
              </section>
            )}
            {tracks.length > 0 && (
              <section className="space-y-3 min-w-0">
                {heading('Songs')}
                <div className="space-y-1">
                  {tracks.slice(0, 4).map((track, i) => (
                    <TrackRow key={`song-${track.id}-${i}`} track={track} onPlay={playFromResults} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {artists.length > 0 && (
            <section className="space-y-3">
              {heading('Artists')}
              <ShelfRow>
                {artists.map((a) => (
                  <ShelfItem key={`artist-${a.id}`}>{artistCard(a)}</ShelfItem>
                ))}
              </ShelfRow>
            </section>
          )}
          {albums.length > 0 && (
            <section className="space-y-3">
              {heading('Albums')}
              <ShelfRow>
                {albums.map((a) => (
                  <ShelfItem key={`album-${a.id}`}>{albumCard(a)}</ShelfItem>
                ))}
              </ShelfRow>
            </section>
          )}
          {playlists.length > 0 && (
            <section className="space-y-3">
              {heading('Playlists')}
              <ShelfRow>
                {playlists.map((p) => (
                  <ShelfItem key={`playlist-${p.id}`}>{playlistCard(p)}</ShelfItem>
                ))}
              </ShelfRow>
            </section>
          )}
        </>
      )}

      {filter === 'songs' && (
        <div className="space-y-1">
          {tracks.map((track, i) => (
            <TrackRow key={`song-${track.id}-${i}`} track={track} index={i} onPlay={playFromResults} />
          ))}
        </div>
      )}

      {(filter === 'artists' || filter === 'albums' || filter === 'playlists') && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filter === 'artists' && artists.map((a) => <React.Fragment key={a.id}>{artistCard(a)}</React.Fragment>)}
          {filter === 'albums' && albums.map((a) => <React.Fragment key={a.id}>{albumCard(a)}</React.Fragment>)}
          {filter === 'playlists' && playlists.map((p) => <React.Fragment key={p.id}>{playlistCard(p)}</React.Fragment>)}
        </div>
      )}
    </div>
  );
}

function TopResultCard({ top, onPlay, onPick }: { top: TopResult; onPlay: (t: Track) => void; onPick?: (item: RecentSearch) => void }) {
  const body = (
    <>
      <div className={cn('relative h-24 w-24 overflow-hidden bg-neutral-800 shadow-lg', top.type === 'artist' ? 'rounded-full' : 'rounded-lg')}>
        <ImageWithFallback src={top.image} alt="" fallbackIcon={<Music2 className="h-8 w-8 text-neutral-600" />} fill sizes="96px" className="object-cover" />
      </div>
      <h3 className="mt-4 line-clamp-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">{top.title}</h3>
      <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-neutral-400">
        <span className="shrink-0 rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-semibold text-white">{TYPE_LABEL[top.type]}</span>
        {top.subtitle && top.subtitle.toLowerCase() !== TYPE_LABEL[top.type].toLowerCase() && (
          <span className="truncate">{top.subtitle}</span>
        )}
      </div>
      <span className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-black shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
        <Play className="h-5 w-5 fill-current ml-0.5" />
      </span>
    </>
  );
  const className = 'group relative block w-full rounded-xl bg-white/[0.06] p-5 text-left hover:bg-white/[0.1] transition-colors';

  if (top.type === 'song' && top.track) {
    const track = top.track;
    return (
      <button type="button" onClick={() => onPlay(track)} className={className} aria-label={`Play ${top.title}`}>
        {body}
      </button>
    );
  }
  if (top.type === 'song') return null;
  return (
    <Link
      href={`${HREF[top.type]}${top.id}`}
      onClick={() => onPick?.({ type: top.type, id: top.id, title: top.title, subtitle: TYPE_LABEL[top.type], image: top.image })}
      className={className}
    >
      {body}
    </Link>
  );
}
