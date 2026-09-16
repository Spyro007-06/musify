'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api/ai';
import {
  AIRecommendationItem,
  AnalyzeLyricsRequest,
  LyricsAnalysis,
  GenerateAIPlaylistRequest,
  GenerateAIPlaylistResult,
} from '@/types/ai';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Hook to fetch AI recommendations by mood.
 * Authenticated only.
 */
export function useAIRecommendations(mood?: string) {
  const { isAuthenticated, isInitializing } = useAuthStore();

  return useQuery<AIRecommendationItem[], Error>({
    queryKey: ['ai', 'recommendations', mood],
    queryFn: async () => {
      const res = await aiApi.getAIRecommendations(mood);
      return res.data || [];
    },
    enabled: isAuthenticated && !isInitializing,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to analyze track lyrics.
 * Authenticated only.
 */
export function useAnalyzeLyrics() {
  return useMutation<LyricsAnalysis, Error, AnalyzeLyricsRequest>({
    mutationFn: async (data: AnalyzeLyricsRequest) => {
      const res = await aiApi.analyzeLyrics(data);
      if (!res.data) {
        throw new Error(res.message || 'Failed to analyze lyrics');
      }
      return res.data;
    },
  });
}

/**
 * Hook to generate an AI playlist from a natural language prompt.
 * Authenticated only.
 */
export function useGenerateAIPlaylist() {
  const queryClient = useQueryClient();

  return useMutation<GenerateAIPlaylistResult, Error, GenerateAIPlaylistRequest>({
    mutationFn: async (data: GenerateAIPlaylistRequest) => {
      const res = await aiApi.generateAIPlaylist(data);
      if (!res.data) {
        throw new Error(res.message || 'Failed to generate playlist');
      }
      return res.data;
    },
    onSuccess: (data) => {
      // If a real playlist was generated and persisted by the backend, invalidate user playlists
      if (data.playlistId) {
        queryClient.invalidateQueries({ queryKey: ['playlists'] });
      }
    },
  });
}
