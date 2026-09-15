import { apiClient } from "@/shared/services/api-client";
import type { Track, Album, Artist, SearchResult } from "@/types/music";
import type { PaginatedResponse } from "@/types/api";

export const musicService = {
  getTrending: async (languages?: string[], artists?: string[]): Promise<Track[]> => {
    const res = await apiClient.get<{ data: Track[] }>("/music/trending", {
      params: {
        languages: languages?.join(","),
        artists: artists?.join(","),
      },
    });
    return res.data.data;
  },

  getNewReleases: async (languages?: string[], artists?: string[]): Promise<Album[]> => {
    const res = await apiClient.get<{ data: Album[] }>("/music/new-releases", {
      params: {
        languages: languages?.join(","),
        artists: artists?.join(","),
      },
    });
    return res.data.data;
  },

  getRecommended: async (): Promise<Track[]> => {
    const res = await apiClient.get<{ data: Track[] }>("/music/recommended");
    return res.data.data;
  },

  getRecommendations: async (languages: string[], artists: string[], limit = 20): Promise<Track[]> => {
    const res = await apiClient.get<{ data: Track[] }>("/music/recommendations", {
      params: { 
        languages: languages.join(","), 
        artists: artists.join(","),
        limit 
      },
    });
    return res.data.data;
  },

  getTrack: async (id: string): Promise<Track> => {
    const res = await apiClient.get<{ data: Track }>(`/music/tracks/${id}`);
    return res.data.data;
  },

  getAlbum: async (id: string): Promise<Album & { tracks: Track[] }> => {
    const res = await apiClient.get<{ data: Album & { tracks: Track[] } }>(`/music/albums/${id}`);
    return res.data.data;
  },

  getAlbums: async (page = 1): Promise<PaginatedResponse<Album>> => {
    const res = await apiClient.get<PaginatedResponse<Album>>("/music/albums", { params: { page } });
    return res.data;
  },

  likeTrack: async (trackId: string): Promise<void> => {
    await apiClient.post(`/music/tracks/${trackId}/like`);
  },

  unlikeTrack: async (trackId: string): Promise<void> => {
    await apiClient.delete(`/music/tracks/${trackId}/like`);
  },

  getLikedSongs: async (page = 1, limit = 50): Promise<Track[]> => {
    const res = await apiClient.get<{ data: Track[] }>("/music/liked", {
      params: { page, limit }
    });
    return res.data.data;
  },

  getRecentlyPlayed: async (page = 1, limit = 20): Promise<Track[]> => {
    const res = await apiClient.get<{ data: Track[] }>("/music/recently-played", {
      params: { page, limit }
    });
    return res.data.data;
  },

  getDashboardRecommendations: async (): Promise<any[]> => {
    const res = await apiClient.get<{ data: any[] }>("/recommendations");
    return res.data.data;
  },

  getCategories: async () => {
    const res = await apiClient.get("/music/categories");
    return res.data.data;
  },

  getMoodPlaylists: async (mood: string) => {
    const res = await apiClient.get(`/music/mood/${mood}`);
    return res.data.data;
  },

  getStreamUrl: async (trackId: string): Promise<string> => {
    const res = await apiClient.get<{ data: { url: string } }>(`/music/tracks/${trackId}/stream`);
    return res.data.data.url;
  },
};
