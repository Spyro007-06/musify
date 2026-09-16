import { apiClient } from './client';
import { Track } from '@/types/track';
import { Artist } from '@/types/artist';
import { Album } from '@/types/album';
import { Playlist } from '@/types/playlist';
import { ApiResponse } from '@/types/api';

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
}

export const searchApi = {
  search: (query: string): Promise<ApiResponse<SearchResults>> =>
    apiClient.get<SearchResults>(`/search?q=${encodeURIComponent(query)}`),

  getSuggestions: (query: string): Promise<ApiResponse<string[]>> =>
    apiClient.get<string[]>(`/search/suggestions?q=${encodeURIComponent(query)}`),
};
