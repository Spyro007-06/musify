import { apiClient } from "@/shared/services/api-client";
import type { Playlist, Track } from "@/types/music";

export const playlistService = {
  getPlaylists: async (): Promise<Playlist[]> => {
    const res = await apiClient.get<{ data: Playlist[] }>("/playlists");
    return res.data.data;
  },

  getPlaylist: async (id: string): Promise<Playlist & { tracks: Track[] }> => {
    const res = await apiClient.get<{ data: Playlist & { tracks: Track[] } }>(`/playlists/${id}`);
    return res.data.data;
  },

  createPlaylist: async (payload: { title?: string; description?: string; albumId?: string }): Promise<Playlist> => {
    const res = await apiClient.post<{ data: Playlist }>("/playlists", payload);
    return res.data.data;
  },

  addTrackToPlaylist: async (playlistId: string, trackId: string): Promise<void> => {
    await apiClient.post(`/playlists/${playlistId}/tracks`, { trackId });
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string): Promise<void> => {
    await apiClient.delete(`/playlists/${playlistId}/tracks/${trackId}`);
  },

  deletePlaylist: async (id: string): Promise<void> => {
    await apiClient.delete(`/playlists/${id}`);
  },
};
