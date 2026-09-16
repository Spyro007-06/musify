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

import { Track } from '@/types/track';
import { usePlayerStore } from '@/stores/player-store';

export function useLikedSongs(page = 1, limit = 50) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  return useQuery<Track[], Error>({
    queryKey: ['music', 'liked', page, limit],
    queryFn: async () => {
      const res = await musicApi.getLiked(page, limit);
      return res.data || [];
    },
    enabled: isAuthenticated && !isInitializing,
    staleTime: 1000 * 60 * 2,
  });
}

export function useRecentlyPlayed(page = 1, limit = 20) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  return useQuery<Track[], Error>({
    queryKey: ['music', 'recentlyPlayed', page, limit],
    queryFn: async () => {
      const res = await musicApi.getRecentlyPlayed(page, limit);
      return res.data || [];
    },
    enabled: isAuthenticated && !isInitializing,
    staleTime: 1000 * 60 * 2,
  });
}

export function useTrack(id: string) {
  return useQuery({
    queryKey: ['music', 'track', id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const res = await musicApi.getTrack(id);
        return res.data || null;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number }; status?: number })?.response?.status || (err as { status?: number })?.status;
        if (status === 404) return null;
        throw err;
      }
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number }; status?: number })?.response?.status || (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 1;
    },
  });
}

export { useAlbum, useAlbums } from './use-album';

export function useLikeTrack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      trackId,
      isLiked,
    }: {
      trackId: string;
      isLiked: boolean;
      track?: Track;
    }) => {
      if (isLiked) {
        return musicApi.unlikeTrack(trackId);
      } else {
        return musicApi.likeTrack(trackId);
      }
    },
    onMutate: async ({ trackId, isLiked, track }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['music', 'liked'] });

      // Snapshot the previous liked tracks
      const previousLiked = queryClient.getQueriesData<Track[]>({ queryKey: ['music', 'liked'] });

      // Optimistically update playerStore if the currently playing track is being liked/unliked
      const currentTrack = usePlayerStore.getState().currentTrack;
      if (currentTrack && currentTrack.id === trackId) {
        usePlayerStore.setState({
          currentTrack: {
            ...currentTrack,
            isLiked: !isLiked,
          },
        });
      }

      // Optimistically update TanStack Query cache for all ['music', 'liked'] queries
      queryClient.setQueriesData<Track[]>({ queryKey: ['music', 'liked'] }, (old) => {
        if (!old) return old;
        if (isLiked) {
          // Unliking: remove track from liked list
          return old.filter((t) => t.id !== trackId);
        } else {
          // Liking: add track to top if provided
          if (track && !old.some((t) => t.id === trackId)) {
            return [{ ...track, isLiked: true }, ...old];
          }
          return old.map((t) => (t.id === trackId ? { ...t, isLiked: true } : t));
        }
      });

      return { previousLiked };
    },
    onError: (_err, { trackId, isLiked }, context) => {
      // Roll back TanStack Query cache
      if (context?.previousLiked) {
        context.previousLiked.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      // Roll back player store currentTrack
      const currentTrack = usePlayerStore.getState().currentTrack;
      if (currentTrack && currentTrack.id === trackId) {
        usePlayerStore.setState({
          currentTrack: {
            ...currentTrack,
            isLiked,
          },
        });
      }
    },
    onSettled: () => {
      // Invalidate relevant queries to keep authoritative state
      queryClient.invalidateQueries({ queryKey: ['music', 'liked'] });
      queryClient.invalidateQueries({ queryKey: ['music', 'trending'] });
      queryClient.invalidateQueries({ queryKey: ['music', 'recentlyPlayed'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['music', 'album'] });
    },
  });
}
