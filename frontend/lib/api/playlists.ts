import { apiClient } from './client';
import { Playlist } from '@/types/playlist';
import { ApiResponse } from '@/types/api';

export const playlistsApi = {
  getUserPlaylists: () => apiClient<ApiResponse<Playlist[]>>('/playlists/me'),
  getPlaylist: (id: string) => apiClient<ApiResponse<Playlist>>(`/playlists/${id}`),
  createPlaylist: (data: { title: string; description?: string; isPublic?: boolean }) =>
    apiClient<ApiResponse<Playlist>>('/playlists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addTrack: (playlistId: string, trackId: string) =>
    apiClient<ApiResponse<void>>(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackId }),
    }),
  removeTrack: (playlistId: string, trackId: string) =>
    apiClient<ApiResponse<void>>(`/playlists/${playlistId}/tracks/${trackId}`, {
      method: 'DELETE',
    }),
};
