import { apiClient } from './client';
import { Artist } from '@/types/artist';
import { Track } from '@/types/track';
import { Album } from '@/types/album';
import { ApiResponse } from '@/types/api';

export const artistsApi = {
  getArtist: (id: string): Promise<ApiResponse<Artist>> =>
    apiClient.get<Artist>(`/artists/${encodeURIComponent(id)}`),

  getTopTracks: (id: string): Promise<ApiResponse<Track[]>> =>
    apiClient.get<Track[]>(`/artists/${encodeURIComponent(id)}/top-tracks`),

  getAlbums: (id: string): Promise<ApiResponse<Album[]>> =>
    apiClient.get<Album[]>(`/artists/${encodeURIComponent(id)}/albums`),

  getRelated: (id: string): Promise<ApiResponse<Artist[]>> =>
    apiClient.get<Artist[]>(`/artists/${encodeURIComponent(id)}/related`),

  getRecommendations: (artists?: string[]): Promise<ApiResponse<Artist[]>> => {
    const query = artists && artists.length > 0 ? `?artists=${encodeURIComponent(artists.join(','))}` : '';
    return apiClient.get<Artist[]>(`/artists/recommendations${query}`);
  },

  followArtist: (id: string): Promise<ApiResponse<void>> =>
    apiClient.post<void>(`/artists/${encodeURIComponent(id)}/follow`),

  unfollowArtist: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete<void>(`/artists/${encodeURIComponent(id)}/follow`),
};
