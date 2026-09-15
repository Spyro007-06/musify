import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

// ─── Shared Types ──────────────────────────────────────────────────────────

export interface MusicItem {
  id: string;
  title: string;
  artwork?: string;
  artists?: { id: string; name: string }[];
  artist?: { id: string; name: string };
  album?: { id: string; title: string; artwork: string; releaseYear?: number; type?: string };
  duration?: number;
  playCount?: number;
  audioUrl?: string;
  isLiked?: boolean;
  genre?: string;
}

export interface AlbumDetail {
  id: string;
  title: string;
  artist: { id: string; name: string };
  artwork?: string;
  releaseYear?: number;
  tracksCount: number;
  type: string;
  genre?: string;
  tracks: MusicItem[];
}

export interface Category {
  id: string;
  name: string;
  cover: string;
  gradient: string;
}

export interface SearchResults {
  tracks: MusicItem[];
  albums: AlbumDetail[];
  artists: ArtistItem[];
  playlists: PlaylistItem[];
}

export interface ArtistItem {
  id: string;
  name: string;
  image?: string;
  followers: number;
  isVerified: boolean;
  genres: string[];
  bio: string;
}

export interface PlaylistItem {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  tracksCount: number;
  owner: string;
  isPublic: boolean;
}

// ─── Trending / New Releases / Recommended ─────────────────────────────────

export const useTrendingMusic = () => {
  return useQuery({
    queryKey: ['trending-music'],
    queryFn: async () => {
      const { data } = await apiClient.get('/music/trending');
      return data.data as MusicItem[];
    },
    staleTime: 1000 * 60 * 15,
  });
};

export const useNewReleases = () => {
  return useQuery({
    queryKey: ['new-releases'],
    queryFn: async () => {
      const { data } = await apiClient.get('/music/new-releases');
      return data.data as MusicItem[];
    },
    staleTime: 1000 * 60 * 15,
  });
};

export const useRecommended = () => {
  return useQuery({
    queryKey: ['recommended'],
    queryFn: async () => {
      const { data } = await apiClient.get('/music/recommended');
      return data.data as MusicItem[];
    },
    staleTime: 1000 * 60 * 15,
  });
};

export const useRecommendations = (genres: string) => {
  return useQuery({
    queryKey: ['recommendations', genres],
    queryFn: async () => {
      const { data } = await apiClient.get(`/music/recommendations?genres=${genres}`);
      return data.data as MusicItem[];
    },
    enabled: !!genres,
    staleTime: 1000 * 60 * 15,
  });
};

// ─── Albums ────────────────────────────────────────────────────────────────

export const useAlbums = (page = 1) => {
  return useQuery({
    queryKey: ['albums', page],
    queryFn: async () => {
      const { data } = await apiClient.get(`/music/albums?page=${page}`);
      return data.data as MusicItem[];
    },
    staleTime: 1000 * 60 * 15,
  });
};

export const useAlbumDetail = (id: string) => {
  return useQuery({
    queryKey: ['album', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/music/albums/${id}`);
      return data.data as AlbumDetail;
    },
    enabled: !!id,
  });
};

// ─── Tracks ────────────────────────────────────────────────────────────────

export const useTrackDetail = (id: string) => {
  return useQuery({
    queryKey: ['track', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/music/tracks/${id}`);
      return data.data as MusicItem;
    },
    enabled: !!id,
  });
};

// ─── User Library ──────────────────────────────────────────────────────────

export const useLikedSongs = () => {
  return useQuery({
    queryKey: ['liked-songs'],
    queryFn: async () => {
      const { data } = await apiClient.get('/music/liked');
      return data.data as MusicItem[];
    },
  });
};

export const useRecentlyPlayed = () => {
  return useQuery({
    queryKey: ['recently-played'],
    queryFn: async () => {
      const { data } = await apiClient.get('/music/recently-played');
      return data.data as MusicItem[];
    },
  });
};

// ─── Categories & Moods ────────────────────────────────────────────────────

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await apiClient.get('/music/categories');
      return data.data as Category[];
    },
    staleTime: 1000 * 60 * 60,
  });
};

export const useMoodPlaylists = (mood: string) => {
  return useQuery({
    queryKey: ['mood-playlists', mood],
    queryFn: async () => {
      const { data } = await apiClient.get(`/music/mood/${mood}`);
      return data.data as PlaylistItem[];
    },
    enabled: !!mood,
  });
};

// ─── Search ────────────────────────────────────────────────────────────────

export const useSearch = (query: string) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const { data } = await apiClient.get(`/search?q=${encodeURIComponent(query)}`);
      return data.data as SearchResults;
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
};

export const useSearchSuggestions = (query: string) => {
  return useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      const { data } = await apiClient.get(`/search/suggestions?q=${encodeURIComponent(query)}`);
      return data.data as string[];
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 2,
  });
};

// ─── Like/Unlike Mutations ─────────────────────────────────────────────────

export const likeTrackApi = async (trackId: string) => {
  await apiClient.post(`/music/tracks/${trackId}/like`);
};

export const unlikeTrackApi = async (trackId: string) => {
  await apiClient.delete(`/music/tracks/${trackId}/like`);
};
