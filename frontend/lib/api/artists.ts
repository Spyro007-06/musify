import { apiClient } from './client';
import { Artist } from '@/types/artist';
import { Track } from '@/types/track';
import { Album } from '@/types/album';
import { ApiResponse } from '@/types/api';

export const artistsApi = {
  getArtist: (id: string) => apiClient<ApiResponse<Artist>>(`/artists/${id}`),
  getTopTracks: (id: string) => apiClient<ApiResponse<Track[]>>(`/artists/${id}/top-tracks`),
  getAlbums: (id: string) => apiClient<ApiResponse<Album[]>>(`/artists/${id}/albums`),
  followArtist: (id: string) =>
    apiClient<ApiResponse<{ followed: boolean }>>(`/artists/${id}/follow`, {
      method: 'POST',
    }),
  unfollowArtist: (id: string) =>
    apiClient<ApiResponse<{ followed: boolean }>>(`/artists/${id}/follow`, {
      method: 'DELETE',
    }),
};
