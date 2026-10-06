import { apiClient } from './client';
import { Playlist } from '@/types/playlist';
import { ApiResponse } from '@/types/api';

export interface LinkImportResult {
  playlist: { id: string; title: string; cover: string | null; tracksCount: number };
  /** Songs newly added (ones already in the playlist are skipped). */
  added: number;
  total: number;
  matched: { title: string; artist: string; trackId: string }[];
  unmatched: { title: string; artist: string }[];
  /** Spotify ids of the songs covered here, so a later paste can skip them. */
  spotifyIds: string[];
  /** Spotify's page lists at most 100 songs; true when that page was full. */
  mayHaveMore: boolean;
  /** The app the link was from: "Spotify", "YouTube", "Apple Music"… */
  source: string;
  /** Other apps: songs the playlist has that the link didn't give (screenshots can add them). */
  missing: number;
}

export interface ImportSongsResult {
  added: number;
  matched: { title: string; artist: string; trackId: string }[];
  unmatched: { title: string; artist: string }[];
}

export interface ImportSong {
  title: string;
  artist: string;
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

  /**
   * A new playlist from a playlist link (Spotify, YouTube, Apple Music, JioSaavn, Deezer, Gaana),
   * or with playlistId its songs added to that (own) playlist.
   */
  importFromLink: (url: string, playlistId?: string): Promise<ApiResponse<LinkImportResult>> =>
    apiClient.post<LinkImportResult>('/playlists/import/link', { url, playlistId }),

  /** At most 25 songs per call (the server rejects more). */
  importSongs: (
    playlistId: string,
    batch: { spotifyIds?: string[]; songs?: ImportSong[] }
  ): Promise<ApiResponse<ImportSongsResult>> =>
    apiClient.post<ImportSongsResult>(`/playlists/${encodeURIComponent(playlistId)}/import/songs`, batch),

  /** Up to 4 base64 JPEGs, in order, read in one call. */
  readScreenshots: (images: string[]): Promise<ApiResponse<{ songs: ImportSong[] }>> =>
    apiClient.post<{ songs: ImportSong[] }>('/playlists/import/screenshot', {
      images: images.map((data) => ({ mimeType: 'image/jpeg', data })),
    }),

  updatePlaylist: (
    id: string,
    data: { title?: string; description?: string; isPublic?: boolean }
  ): Promise<ApiResponse<Pick<Playlist, 'id' | 'title' | 'description' | 'isPublic'>>> =>
    apiClient.put(`/playlists/${encodeURIComponent(id)}`, data),

  /** `trackIds` must list exactly the playlist's tracks, in the new order. */
  reorderTracks: (id: string, trackIds: string[]): Promise<ApiResponse<void>> =>
    apiClient.put<void>(`/playlists/${encodeURIComponent(id)}/tracks/order`, { trackIds }),

  deletePlaylist: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete<void>(`/playlists/${encodeURIComponent(id)}`),

  addTrack: (playlistId: string, trackId: string): Promise<ApiResponse<void>> =>
    apiClient.post<void>(`/playlists/${encodeURIComponent(playlistId)}/tracks`, { trackId }),

  removeTrack: (playlistId: string, trackId: string): Promise<ApiResponse<void>> =>
    apiClient.delete<void>(`/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`),
};

