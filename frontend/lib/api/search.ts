import { apiClient } from './client';
import { Track } from '@/types/track';
import { Artist } from '@/types/artist';
import { Album } from '@/types/album';
import { Playlist } from '@/types/playlist';
import { ApiResponse } from '@/types/api';

/** JioSaavn's single best match for the query — the "Top result" card. */
export interface TopResult {
  type: 'song' | 'artist' | 'album' | 'playlist';
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  /** Present for songs, so the card can play straight away. */
  track?: Track;
}

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  top?: TopResult | null;
}

export const searchApi = {
  search: (query: string): Promise<ApiResponse<SearchResults>> =>
    apiClient.get<SearchResults>(`/search?q=${encodeURIComponent(query)}`),
};
