import { apiClient } from './client';
import { Track, Lyrics } from '@/types/track';
import { Album } from '@/types/album';
import { Category } from '@/types/category';
import { Playlist } from '@/types/playlist';
import { ApiResponse } from '@/types/api';
import { MoodId } from '@/types/user';

/** basis 'mood' = a home-screen mood check-in is steering the picks (see `mood`). */
export interface RecommendedResult {
  tracks: Track[];
  personalized: boolean;
  basis: 'mood' | 'taste' | 'history' | 'language' | 'generic';
  mood?: MoodId;
}

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
    // Sends the auth token (when present) so the backend can apply the
    // user's stored language preference; the route stays reachable
    // logged-out via optionalAuthenticate.
    return apiClient.get<Album[]>(`/music/new-releases${query}`);
  },

  getRecommended: async (): Promise<ApiResponse<RecommendedResult>> => {
    return apiClient.get<RecommendedResult>('/music/recommended');
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
    // Sends the auth token (when present) so the backend can bias results
    // toward the user's tuned genre preference; still works logged-out.
    return apiClient.get<Playlist[]>(`/music/mood/${encodeURIComponent(mood)}`);
  },

  // Songs to continue the queue with, never ones already played or skipped.
  // seeds: latest played ids (newest first); exclude: ids the player already has.
  getAutoplay: async (seeds: string[], exclude: string[]): Promise<ApiResponse<Track[]>> => {
    const params = new URLSearchParams({ seeds: seeds.join(','), exclude: exclude.join(',') });
    return apiClient.get<Track[]>(`/music/autoplay?${params.toString()}`);
  },

  // Current chart playlists ("Today's biggest hits") in the user's language.
  getTopHits: async (): Promise<ApiResponse<Playlist[]>> => {
    return apiClient.get<Playlist[]>('/music/top-hits');
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

  getLiked: async (page = 1, limit = 50): Promise<ApiResponse<Track[]>> => {
    return apiClient.get<Track[]>(`/music/liked?page=${page}&limit=${limit}`);
  },

  getRecentlyPlayed: async (page = 1, limit = 20): Promise<ApiResponse<Track[]>> => {
    return apiClient.get<Track[]>(`/music/recently-played?page=${page}&limit=${limit}`);
  },

  likeTrack: async (trackId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.post<unknown>(`/music/tracks/${encodeURIComponent(trackId)}/like`);
  },

  unlikeTrack: async (trackId: string): Promise<ApiResponse<unknown>> => {
    return apiClient.delete<unknown>(`/music/tracks/${encodeURIComponent(trackId)}/like`);
  },

  getLyrics: (trackId: string): Promise<ApiResponse<Lyrics>> =>
    apiClient.get<Lyrics>(`/music/tracks/${encodeURIComponent(trackId)}/lyrics`, { requiresAuth: false }),

  /** Each lyric line in Latin letters and in English, aligned with getLyrics' lines. Needs sign-in. */
  getLyricsTranslation: (trackId: string): Promise<ApiResponse<{ lines: { latin: string; meaning: string }[] }>> =>
    apiClient.get(`/music/tracks/${encodeURIComponent(trackId)}/lyrics/translation`),

  /** Songs a remembered line of lyrics is likely from. Needs sign-in. */
  findByLyrics: (line: string): Promise<ApiResponse<Track[]>> =>
    apiClient.get<Track[]>(`/music/lyrics-search?q=${encodeURIComponent(line)}`),

  getStream: async (trackId: string): Promise<ApiResponse<{ url: string; streamUrl?: string }>> => {
    return apiClient.get<{ url: string; streamUrl?: string }>(`/music/tracks/${encodeURIComponent(trackId)}/stream`);
  },

  // Same endpoint as getStream, but flagged so the backend resolves the
  // playable URL without logging a play — used to warm the next queued
  // track's URL ahead of time, before the user has actually played it.
  prefetchStream: async (trackId: string): Promise<ApiResponse<{ url: string; streamUrl?: string }>> => {
    return apiClient.get<{ url: string; streamUrl?: string }>(
      `/music/tracks/${encodeURIComponent(trackId)}/stream?prefetch=true`
    );
  },

  /** A link shared to Musify: the song ready to play (track null if it's not in the catalog), or a playlist to import. */
  resolveSharedLink: (url: string): Promise<ApiResponse<SharedLink>> =>
    apiClient.get<SharedLink>(`/music/shared-link?url=${encodeURIComponent(url)}`, { requiresAuth: false }),
};

export type SharedLink = { kind: 'playlist' } | { kind: 'song'; song: { title: string; artist: string }; track: Track | null };
