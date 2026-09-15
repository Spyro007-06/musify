'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { musicApi } from '@/lib/api/music';
import { useAuthStore } from '@/stores/auth-store';

export function useTrending(languages?: string, artists?: string) {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['music', 'trending', languages, artists, isAuthenticated],
    queryFn: async () => {
      const res = await musicApi.getTrending(languages, artists);
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useNewReleases(languages?: string, artists?: string) {
  return useQuery({
    queryKey: ['music', 'newReleases', languages, artists],
    queryFn: async () => {
      const res = await musicApi.getNewReleases(languages, artists);
      return res.data || [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useRecommended() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['music', 'recommended', isAuthenticated],
    queryFn: async () => {
      const res = await musicApi.getRecommended();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['music', 'categories'],
    queryFn: async () => {
      const res = await musicApi.getCategories();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useMood(mood: string) {
  return useQuery({
    queryKey: ['music', 'mood', mood],
    queryFn: async () => {
      if (!mood) return [];
      const res = await musicApi.getMood(mood);
      return res.data || [];
    },
    enabled: !!mood,
    staleTime: 1000 * 60 * 15,
  });
}

export function useLikedSongs() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['music', 'liked'],
    queryFn: async () => {
      const res = await musicApi.getLiked();
      return res.data || [];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}

export function useRecentlyPlayed() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['music', 'recentlyPlayed'],
    queryFn: async () => {
      const res = await musicApi.getRecentlyPlayed();
      return res.data || [];
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTrack(id: string) {
  return useQuery({
    queryKey: ['music', 'track', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await musicApi.getTrack(id);
      return res.data || null;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

export function useAlbum(id: string) {
  return useQuery({
    queryKey: ['music', 'album', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await musicApi.getAlbum(id);
      return res.data || null;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
  });
}

export function useLikeTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ trackId, isLiked }: { trackId: string; isLiked: boolean }) => {
      if (isLiked) {
        return musicApi.unlikeTrack(trackId);
      } else {
        return musicApi.likeTrack(trackId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['music', 'liked'] });
      queryClient.invalidateQueries({ queryKey: ['music', 'trending'] });
    },
  });
}
