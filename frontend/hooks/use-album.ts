'use client';

import { useQuery } from '@tanstack/react-query';
import { musicApi } from '@/lib/api/music';
import { Album } from '@/types/album';
import { ApiError } from '@/types/api';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Hook to fetch detailed album metadata including its track collection.
 * Optional auth: populates isLiked on each track if authenticated.
 */
export function useAlbum(id: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery<Album, Error>({
    queryKey: ['music', 'album', id, isAuthenticated],
    queryFn: async () => {
      const res = await musicApi.getAlbum(id);
      if (!res.data) {
        throw new Error(res.message || 'Album not found');
      }
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error) => {
      // Do not retry on 404 Not Found
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Hook to fetch paginated catalog albums.
 * Public backend content (GET /api/music/albums?page=).
 */
export function useAlbums(page = 1) {
  return useQuery<Album[], Error>({
    queryKey: ['music', 'albums', page],
    queryFn: async () => {
      const res = await musicApi.getAlbums(page);
      return res.data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
