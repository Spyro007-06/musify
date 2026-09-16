import { apiClient } from './client';
import {
  AIRecommendationItem,
  AnalyzeLyricsRequest,
  LyricsAnalysis,
  GenerateAIPlaylistRequest,
  GenerateAIPlaylistResult,
} from '@/types/ai';
import { ApiResponse } from '@/types/api';

export const aiApi = {
  getAIRecommendations: (mood?: string): Promise<ApiResponse<AIRecommendationItem[]>> => {
    const query = mood ? `?mood=${encodeURIComponent(mood)}` : '';
    return apiClient.get<AIRecommendationItem[]>(`/ai/recommendations${query}`, {
      requiresAuth: true,
    });
  },

  analyzeLyrics: (data: AnalyzeLyricsRequest): Promise<ApiResponse<LyricsAnalysis>> =>
    apiClient.post<LyricsAnalysis>('/ai/lyrics/analyze', data, {
      requiresAuth: true,
      requiresCsrf: true,
    }),

  generateAIPlaylist: (
    data: GenerateAIPlaylistRequest
  ): Promise<ApiResponse<GenerateAIPlaylistResult>> =>
    apiClient.post<GenerateAIPlaylistResult>('/ai/playlist/generate', data, {
      requiresAuth: true,
      requiresCsrf: true,
    }),
};
