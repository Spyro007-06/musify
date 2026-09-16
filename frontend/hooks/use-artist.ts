'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { artistsApi } from '@/lib/api/artists';
import { Artist } from '@/types/artist';
import { Track } from '@/types/track';
import { Album } from '@/types/album';
import { useAuthStore } from '@/stores/auth-store';

import { ApiError } from '@/types/api';

/**
 * Hook to fetch detailed artist metadata.
 * Optional auth: returns isFollowing state if authenticated.
 */
export function useArtist(id: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery<Artist, Error>({
    queryKey: ['artists', id, isAuthenticated],
    queryFn: async () => {
      const res = await artistsApi.getArtist(id);
      if (!res.data) {
        throw new Error(res.message || 'Artist not found');
      }
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Hook to fetch an artist's top tracks.
 * Optional auth: populates isLiked per track if authenticated.
 */
export function useArtistTopTracks(id: string) {
  const { isAuthenticated } = useAuthStore();

  return useQuery<Track[], Error>({
    queryKey: ['artists', id, 'top-tracks', isAuthenticated],
    queryFn: async () => {
      const res = await artistsApi.getTopTracks(id);
      return res.data || [];
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch an artist's albums/discography.
 */
export function useArtistAlbums(id: string) {
  return useQuery<Album[], Error>({
    queryKey: ['artists', id, 'albums'],
    queryFn: async () => {
      const res = await artistsApi.getAlbums(id);
      return res.data || [];
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to fetch related artists ("Fans Also Like").
 */
export function useRelatedArtists(id: string) {
  return useQuery<Artist[], Error>({
    queryKey: ['artists', id, 'related'],
    queryFn: async () => {
      const res = await artistsApi.getRelated(id);
      return res.data || [];
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to toggle follow/unfollow status for an artist.
 * Optimistically updates the artist query cache and rolls back on error.
 */
export function useToggleFollowArtist(artistId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: async ({ isFollowing }: { isFollowing: boolean }) => {
      if (!isAuthenticated) {
        throw new Error('AUTH_REQUIRED');
      }

      if (isFollowing) {
        return artistsApi.unfollowArtist(artistId);
      } else {
        return artistsApi.followArtist(artistId);
      }
    },
    onMutate: async ({ isFollowing }) => {
      if (!isAuthenticated) {
        return;
      }

      // Cancel outgoing queries matching this artist
      await queryClient.cancelQueries({ queryKey: ['artists', artistId] });

      // Snapshot previous query data across all queries matching ['artists', artistId]
      const previousData = queryClient.getQueriesData<Artist>({
        queryKey: ['artists', artistId],
      });

      // Optimistically update all matching artist queries
      queryClient.setQueriesData<Artist>(
        { queryKey: ['artists', artistId] },
        (old) => {
          if (!old) return old;
          const nextFollowing = !isFollowing;
          const currentFollowers = old.followers ?? old.followerCount ?? 0;
          const updatedFollowers = nextFollowing
            ? currentFollowers + 1
            : Math.max(0, currentFollowers - 1);

          return {
            ...old,
            isFollowing: nextFollowing,
            isFollowed: nextFollowing,
            followers: updatedFollowers,
            followerCount: updatedFollowers,
          };
        }
      );

      return { previousData };
    },
    onError: (err: unknown, _vars, context) => {
      if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
        router.push('/login');
        return;
      }

      // Rollback to snapshot data
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['artists', artistId] });
      queryClient.invalidateQueries({ queryKey: ['recommendations', 'artists'] });
    },
  });
}
