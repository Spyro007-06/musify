import { apiClient } from './client';
import { RecommendationSection } from '@/types/recommendations';
import { Track } from '@/types/track';
import { ApiResponse } from '@/types/api';

export const recommendationsApi = {
  getHomeFeed: () => apiClient<ApiResponse<RecommendationSection[]>>('/recommendations/home'),
  getDiscoverWeekly: () => apiClient<ApiResponse<Track[]>>('/recommendations/discover-weekly'),
  getMoodTracks: (mood: string) =>
    apiClient<ApiResponse<Track[]>>(`/recommendations/mood?mood=${encodeURIComponent(mood)}`),
};
