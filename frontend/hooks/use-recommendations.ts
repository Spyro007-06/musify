'use client';

import { useQuery } from '@tanstack/react-query';
import { recommendationsApi } from '@/lib/api/recommendations';
import { useAuthStore } from '@/stores/auth-store';
import {
  DashboardRecommendationSection,
} from '@/types/recommendations';
import { Track } from '@/types/track';
import { Album } from '@/types/album';
import { Artist } from '@/types/artist';

/**
 * Hook to fetch dashboard recommendations.
 * Optional auth: returns guest recommendations for unauthenticated users,
 * personalized sections for authenticated users.
 */
export function useDashboardRecommendations() {
  const { isAuthenticated } = useAuthStore();

  return useQuery<DashboardRecommendationSection[]>({
    queryKey: ['recommendations', 'dashboard', isAuthenticated],
    queryFn: async () => {
      const res = await recommendationsApi.getDashboardRecommendations();
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to fetch Discover Weekly mixtape.
 * Authenticated only.
 */
export function useDiscoverWeekly() {
  const { isAuthenticated, isInitializing } = useAuthStore();

  return useQuery<Track[]>({
    queryKey: ['recommendations', 'discover-weekly'],
    queryFn: async () => {
      const res = await recommendationsApi.getDiscoverWeekly();
      return res.data || [];
    },
    enabled: isAuthenticated && !isInitializing,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: false,
  });
}

/**
 * Hook to fetch personalized recommended songs.
 * Authenticated only.
 */
export function useRecommendedSongs() {
  const { isAuthenticated, isInitializing } = useAuthStore();

  return useQuery<Track[]>({
    queryKey: ['recommendations', 'songs'],
    queryFn: async () => {
      const res = await recommendationsApi.getRecommendedSongs();
      return res.data || [];
    },
    enabled: isAuthenticated && !isInitializing,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

/**
 * Hook to fetch personalized recommended albums.
 * Authenticated only.
 */
export function useRecommendedAlbums() {
  const { isAuthenticated, isInitializing } = useAuthStore();

  return useQuery<Album[]>({
    queryKey: ['recommendations', 'albums'],
    queryFn: async () => {
      const res = await recommendationsApi.getRecommendedAlbums();
      return res.data || [];
    },
    enabled: isAuthenticated && !isInitializing,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: false,
  });
}

/**
 * Hook to fetch personalized recommended artists.
 * Authenticated only.
 */
export function useRecommendedArtists() {
  const { isAuthenticated, isInitializing } = useAuthStore();

  return useQuery<Artist[]>({
    queryKey: ['recommendations', 'artists'],
    queryFn: async () => {
      const res = await recommendationsApi.getRecommendedArtists();
      return res.data || [];
    },
    enabled: isAuthenticated && !isInitializing,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: false,
  });
}
