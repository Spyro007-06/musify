import { apiClient } from './client';
import { Album } from '@/types/album';
import { Track } from '@/types/track';
import { ApiResponse } from '@/types/api';

export const albumsApi = {
  getAlbum: (id: string) => apiClient<ApiResponse<Album & { tracks: Track[] }>>(`/albums/${id}`),
  likeAlbum: (id: string) =>
    apiClient<ApiResponse<{ liked: boolean }>>(`/albums/${id}/like`, {
      method: 'POST',
    }),
  unlikeAlbum: (id: string) =>
    apiClient<ApiResponse<{ liked: boolean }>>(`/albums/${id}/like`, {
      method: 'DELETE',
    }),
};
