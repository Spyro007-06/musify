import * as React from 'react';
import { SearchResults as SearchResultsType } from '@/lib/api/search';
import { TrackRow } from '@/components/music/track-row';
import { ArtistCard } from '@/components/music/artist-card';
import { AlbumCard } from '@/components/music/album-card';
import { PlaylistCard } from '@/components/music/playlist-card';
import { MusicGrid } from '@/components/music/music-grid';
import { cn } from '@/lib/utils/cn';

export interface SearchResultsProps {
  results: SearchResultsType | null;
  className?: string;
}

export function SearchResults({ results, className }: SearchResultsProps) {
  if (!results) return null;

  return (
    <div className={cn('space-y-8', className)}>
      {results.tracks && results.tracks.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-white mb-3">Songs</h3>
          <div className="space-y-1">
            {results.tracks.slice(0, 5).map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} />
            ))}
          </div>
        </section>
      )}

      {results.artists && results.artists.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-white mb-3">Artists</h3>
          <MusicGrid>
            {results.artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </MusicGrid>
        </section>
      )}

      {results.albums && results.albums.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-white mb-3">Albums</h3>
          <MusicGrid>
            {results.albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </MusicGrid>
        </section>
      )}

      {results.playlists && results.playlists.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-white mb-3">Playlists</h3>
          <MusicGrid>
            {results.playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </MusicGrid>
        </section>
      )}
    </div>
  );
}
