import { apiClient } from './client';
import {
  AIRecommendationItem,
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

  generateAIPlaylist: (
    data: GenerateAIPlaylistRequest
  ): Promise<ApiResponse<GenerateAIPlaylistResult>> =>
    apiClient.post<GenerateAIPlaylistResult>('/ai/playlist/generate', data, {
      requiresAuth: true,
      requiresCsrf: true,
    }),
};
