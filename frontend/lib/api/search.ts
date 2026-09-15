import { apiClient } from './client';
import { Track } from '@/types/track';
import { Artist } from '@/types/artist';
import { Album } from '@/types/album';
import { Playlist } from '@/types/playlist';
import { ApiResponse } from '@/types/api';

export interface SearchResults {
  tracks?: Track[];
  artists?: Artist[];
  albums?: Album[];
  playlists?: Playlist[];
}

export const searchApi = {
  search: (query: string, type?: string) =>
    apiClient<ApiResponse<SearchResults>>(`/search?q=${encodeURIComponent(query)}${type ? `&type=${type}` : ''}`),
  getSuggestions: (query: string) =>
    apiClient<ApiResponse<string[]>>(`/search/suggestions?q=${encodeURIComponent(query)}`),
};
