import { apiClient } from './client';
import { Track } from '@/types/track';
import { Album } from '@/types/album';
import { Category } from '@/types/category';
import { Playlist } from '@/types/playlist';
import { ApiResponse } from '@/types/api';

export const musicApi = {
  getTrending: async (languages?: string, artists?: string): Promise<ApiResponse<Track[]>> => {
    const params = new URLSearchParams();
    if (languages) params.append('languages', languages);
    if (artists) params.append('artists', artists);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<Track[]>(`/music/trending${query}`);
  },

  getNewReleases: async (languages?: string, artists?: string): Promise<ApiResponse<Album[]>> => {
    const params = new URLSearchParams();
    if (languages) params.append('languages', languages);
    if (artists) params.append('artists', artists);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<Album[]>(`/music/new-releases${query}`, { requiresAuth: false });
  },

  getRecommended: async (): Promise<ApiResponse<Track[]>> => {
    return apiClient.get<Track[]>('/music/recommended');
  },

  getRecommendations: async (genres?: string, limit?: number): Promise<ApiResponse<Track[]>> => {
    const params = new URLSearchParams();
    if (genres) params.append('genres', genres);
    if (limit) params.append('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<Track[]>(`/music/recommendations${query}`);
  },

  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    return apiClient.get<Category[]>('/music/categories', { requiresAuth: false });
  },

  getMood: async (mood: string): Promise<ApiResponse<Playlist[]>> => {
    return apiClient.get<Playlist[]>(`/music/mood/${encodeURIComponent(mood)}`, {
      requiresAuth: false,
    });
  },

  getTrack: async (id: string): Promise<ApiResponse<Track>> => {
    return apiClient.get<Track>(`/music/tracks/${encodeURIComponent(id)}`);
  },

  getAlbum: async (id: string): Promise<ApiResponse<Album>> => {
    return apiClient.get<Album>(`/music/albums/${encodeURIComponent(id)}`);
  },

  getAlbums: async (page = 1): Promise<ApiResponse<Album[]>> => {
    return apiClient.get<Album[]>(`/music/albums?page=${page}`, { requiresAuth: false });
  },

  getLiked: async (): Promise<ApiResponse<Track[]>> => {
    return apiClient.get<Track[]>('/music/liked');
  },

  getRecentlyPlayed: async (): Promise<ApiResponse<Track[]>> => {
    return apiClient.get<Track[]>('/music/recently-played');
  },

  likeTrack: async (trackId: string): Promise<ApiResponse<{ liked: boolean }>> => {
    return apiClient.post<{ liked: boolean }>(`/music/tracks/${encodeURIComponent(trackId)}/like`);
  },

  unlikeTrack: async (trackId: string): Promise<ApiResponse<{ liked: boolean }>> => {
    return apiClient.delete<{ liked: boolean }>(`/music/tracks/${encodeURIComponent(trackId)}/like`);
  },

  getStream: async (trackId: string): Promise<ApiResponse<{ url: string; streamUrl?: string }>> => {
    return apiClient.get<{ url: string; streamUrl?: string }>(`/music/tracks/${encodeURIComponent(trackId)}/stream`);
  },
};
