'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playlistsApi } from '@/lib/api/playlists';
import { useAuthStore } from '@/stores/auth-store';
import { Playlist } from '@/types/playlist';

export function usePlaylists() {
  const { isAuthenticated, isInitializing } = useAuthStore();

  return useQuery<Playlist[], Error>({
    queryKey: ['playlists', 'user'],
    queryFn: async () => {
      const res = await playlistsApi.getUserPlaylists();
      return res.data || [];
    },
    enabled: isAuthenticated && !isInitializing,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePlaylist(id: string) {
  return useQuery<Playlist | null, Error>({
    queryKey: ['playlist', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await playlistsApi.getPlaylist(id);
      return res.data || null;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
    retry: (failureCount, error: any) => {
      // Don't retry on 403 (forbidden/private) or 404 (not found)
      if (error?.status === 403 || error?.status === 404 || error?.statusCode === 403 || error?.statusCode === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      coverUrl?: string;
      isPublic?: boolean;
    }) => {
      const res = await playlistsApi.createPlaylist(payload);
      return res.data;
    },
    onSuccess: (newPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ['playlists', 'user'] });
      if (newPlaylist?.id) {
        queryClient.setQueryData(['playlist', newPlaylist.id], newPlaylist);
      }
    },
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlistId: string) => {
      await playlistsApi.deletePlaylist(playlistId);
      return playlistId;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['playlists', 'user'] });
      queryClient.removeQueries({ queryKey: ['playlist', deletedId] });
    },
  });
}

export function useAddTrackToPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      await playlistsApi.addTrack(playlistId, trackId);
      return { playlistId, trackId };
    },
    onSuccess: ({ playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists', 'user'] });
    },
  });
}

export function useRemoveTrackFromPlaylist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      await playlistsApi.removeTrack(playlistId, trackId);
      return { playlistId, trackId };
    },
    onSuccess: ({ playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists', 'user'] });
    },
  });
}
