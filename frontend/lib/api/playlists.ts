import { apiClient } from './client';
import { Playlist } from '@/types/playlist';
import { ApiResponse } from '@/types/api';

export const playlistsApi = {
  getUserPlaylists: (): Promise<ApiResponse<Playlist[]>> =>
    apiClient.get<Playlist[]>('/playlists'),

  getPlaylist: (id: string): Promise<ApiResponse<Playlist>> =>
    apiClient.get<Playlist>(`/playlists/${encodeURIComponent(id)}`),

  createPlaylist: (data: {
    title: string;
    description?: string;
    coverUrl?: string;
    isPublic?: boolean;
  }): Promise<ApiResponse<Playlist>> =>
    apiClient.post<Playlist>('/playlists', data),

  deletePlaylist: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete<void>(`/playlists/${encodeURIComponent(id)}`),

  addTrack: (playlistId: string, trackId: string): Promise<ApiResponse<void>> =>
    apiClient.post<void>(`/playlists/${encodeURIComponent(playlistId)}/tracks`, { trackId }),

  removeTrack: (playlistId: string, trackId: string): Promise<ApiResponse<void>> =>
    apiClient.delete<void>(`/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`),
};

