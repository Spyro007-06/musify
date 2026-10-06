'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playlistsApi } from '@/lib/api/playlists';
import { useAuthStore } from '@/stores/auth-store';
import { Playlist } from '@/types/playlist';
import { Track } from '@/types/track';

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
    queryKey: ['playlists', 'detail', id],
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
        queryClient.setQueryData(['playlists', 'detail', newPlaylist.id], newPlaylist);
      }
    },
  });
}

export function useImportPlaylistLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ url, playlistId }: { url: string; playlistId?: string }) => {
      const res = await playlistsApi.importFromLink(url, playlistId);
      return res.data;
    },
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['playlists', 'user'] });
      if (playlistId) queryClient.invalidateQueries({ queryKey: ['playlists', 'detail', playlistId] });
    },
  });
}

export function useUpdatePlaylist(playlistId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title?: string; description?: string; isPublic?: boolean }) => {
      const res = await playlistsApi.updatePlaylist(playlistId, data);
      return res.data;
    },
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData<Playlist | null>(['playlists', 'detail', playlistId], (old) =>
          old ? { ...old, ...updated } : old
        );
      }
      queryClient.invalidateQueries({ queryKey: ['playlists', 'user'] });
    },
  });
}

/** Saves a new order, showing it right away and rolling back if the save fails. */
export function useReorderPlaylistTracks(playlistId: string) {
  const queryClient = useQueryClient();
  const key = ['playlists', 'detail', playlistId];

  return useMutation({
    mutationFn: async (tracks: Track[]) => {
      await playlistsApi.reorderTracks(playlistId, tracks.map((t) => t.id));
    },
    onMutate: async (tracks) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Playlist | null>(key);
      queryClient.setQueryData<Playlist | null>(key, (old) => (old ? { ...old, tracks } : old));
      return { previous };
    },
    onError: (_err, _tracks, context) => {
      queryClient.setQueryData(key, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
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
      queryClient.removeQueries({ queryKey: ['playlists', 'detail', deletedId] });
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
      queryClient.invalidateQueries({ queryKey: ['playlists', 'detail', playlistId] });
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
      queryClient.invalidateQueries({ queryKey: ['playlists', 'detail', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists', 'user'] });
    },
  });
}
