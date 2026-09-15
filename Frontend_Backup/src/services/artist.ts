import { apiClient } from "@/shared/services/api-client";
import type { Artist } from "@/types/music";

export const artistService = {
  getArtist: async (id: string) => {
    const res = await apiClient.get(`/artists/${id}`);
    return res.data.data;
  },

  getArtistTopTracks: async (id: string) => {
    const res = await apiClient.get(`/artists/${id}/top-tracks`);
    return res.data.data;
  },

  getArtistAlbums: async (id: string) => {
    const res = await apiClient.get(`/artists/${id}/albums`);
    return res.data.data;
  },

  getRelatedArtists: async (id: string): Promise<Artist[]> => {
    const res = await apiClient.get(`/artists/${id}/related`);
    return res.data.data;
  },

  getRecommendedArtists: async (artists?: string[]): Promise<Artist[]> => {
    const res = await apiClient.get<{ data: Artist[] }>("/artists/recommendations", {
      params: {
        artists: artists?.join(","),
      },
    });
    return res.data.data;
  },

  followArtist: async (id: string): Promise<void> => {
    await apiClient.post(`/artists/${id}/follow`);
  },

  unfollowArtist: async (id: string): Promise<void> => {
    await apiClient.delete(`/artists/${id}/follow`);
  },
};
