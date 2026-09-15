import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { ArtistItem, MusicItem, AlbumDetail } from './useMusic';

export const useArtist = (id: string) => {
  return useQuery({
    queryKey: ['artist', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/artists/${id}`);
      return data.data as ArtistItem;
    },
    enabled: !!id,
  });
};

export const useArtistTopTracks = (id: string) => {
  return useQuery({
    queryKey: ['artist-top-tracks', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/artists/${id}/top-tracks`);
      return data.data as MusicItem[];
    },
    enabled: !!id,
  });
};

export const useArtistAlbums = (id: string) => {
  return useQuery({
    queryKey: ['artist-albums', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/artists/${id}/albums`);
      return data.data as AlbumDetail[];
    },
    enabled: !!id,
  });
};

export const useRelatedArtists = (id: string) => {
  return useQuery({
    queryKey: ['related-artists', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/artists/${id}/related`);
      return data.data as ArtistItem[];
    },
    enabled: !!id,
  });
};

export const followArtistApi = async (id: string) => {
  await apiClient.post(`/artists/${id}/follow`);
};

export const unfollowArtistApi = async (id: string) => {
  await apiClient.delete(`/artists/${id}/follow`);
};
