import { apiClient } from './client';
import {
  DashboardRecommendationSection,
  RecommendationFeedbackPayload,
  SmartQueuePayload,
} from '@/types/recommendations';
import { Track } from '@/types/track';
import { Album } from '@/types/album';
import { Artist } from '@/types/artist';
import { ApiResponse } from '@/types/api';

export const recommendationsApi = {
  /**
   * Main entrypoint for dynamic dashboard/discover sections.
   * Optional auth: returns default cold-start sections for guests, personalized for users.
   */
  getDashboardRecommendations: (): Promise<ApiResponse<DashboardRecommendationSection[]>> =>
    apiClient.get<DashboardRecommendationSection[]>('/recommendations'),

  /**
   * Personalized recommended songs sorted by recommendation score.
   * Required auth.
   */
  getRecommendedSongs: (): Promise<ApiResponse<Track[]>> =>
    apiClient.get<Track[]>('/recommendations/songs'),

  /**
   * Personalized recommended albums based on user's favourite artists and languages.
   * Required auth.
   */
  getRecommendedAlbums: (): Promise<ApiResponse<Album[]>> =>
    apiClient.get<Album[]>('/recommendations/albums'),

  /**
   * Personalized recommended artists based on user's affinities and language preferences.
   * Required auth.
   */
  getRecommendedArtists: (): Promise<ApiResponse<Artist[]>> =>
    apiClient.get<Artist[]>('/recommendations/artists'),

  /**
   * Discover Weekly mixtape: tracks matching taste excluding listening history.
   * Required auth.
   */
  getDiscoverWeekly: (): Promise<ApiResponse<Track[]>> =>
    apiClient.get<Track[]>('/recommendations/discover'),

  /**
   * Log playback feedback (complete, skip, replay) for recommendation scoring.
   * Required auth.
   */
  logFeedback: (payload: RecommendationFeedbackPayload): Promise<ApiResponse<{ success: boolean }>> =>
    apiClient.post<{ success: boolean }>('/recommendations/feedback', payload),

  /**
   * Generate a smart queue seeded by an anchor track and artist.
   * Required auth.
   */
  getSmartQueue: (payload: SmartQueuePayload): Promise<ApiResponse<Track[]>> =>
    apiClient.post<Track[]>('/recommendations/smart-queue', payload),
};
