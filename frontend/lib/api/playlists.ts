import { apiClient } from './client';
import { Playlist } from '@/types/playlist';
import { ApiResponse } from '@/types/api';

export interface SpotifyImportResult {
  playlist: { id: string; title: string; cover: string | null; tracksCount: number };
  total: number;
  matched: { title: string; artist: string; trackId: string }[];
  unmatched: { title: string; artist: string }[];
}

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

  importFromSpotify: (url: string): Promise<ApiResponse<SpotifyImportResult>> =>
    apiClient.post<SpotifyImportResult>('/playlists/import/spotify', { url }),

  deletePlaylist: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete<void>(`/playlists/${encodeURIComponent(id)}`),

  addTrack: (playlistId: string, trackId: string): Promise<ApiResponse<void>> =>
    apiClient.post<void>(`/playlists/${encodeURIComponent(playlistId)}/tracks`, { trackId }),

  removeTrack: (playlistId: string, trackId: string): Promise<ApiResponse<void>> =>
    apiClient.delete<void>(`/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`),
};

