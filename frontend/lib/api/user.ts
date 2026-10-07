import { apiClient } from './client';
import { ApiResponse } from '@/types/api';
import { User, UpdateProfileRequest, UserPreferences, ListeningStats, MoodId } from '@/types/user';

export type { UserPreferences, UpdateProfileRequest };

export async function getUserProfile(): Promise<ApiResponse<User>> {
  return apiClient.get<User>('/user/profile');
}

export async function updateUserProfile(
  data: UpdateProfileRequest
): Promise<ApiResponse<User>> {
  return apiClient.put<User>('/user/profile', data);
}

export async function getUserPreferences(): Promise<ApiResponse<UserPreferences>> {
  return apiClient.get<UserPreferences>('/user/preferences');
}

export async function updateUserPreferences(
  preferences: UserPreferences
): Promise<ApiResponse<void>> {
  return apiClient.post<void>('/user/preferences', preferences);
}

/**
 * month: YYYY-MM; omitted = this month. Months start at this device's
 * midnight (tzOffset: minutes east of UTC), not UTC's: in India a play at
 * 1 a.m. on the 1st belongs to the new month.
 */
export async function getListeningStats(month?: string): Promise<ApiResponse<ListeningStats>> {
  const params = new URLSearchParams({ tzOffset: String(-new Date().getTimezoneOffset()) });
  if (month) params.set('month', month);
  return apiClient.get<ListeningStats>(`/user/stats?${params}`);
}

/** The mood checked in on the home screen within the last 3 hours, if any. */
export async function getMood(): Promise<ApiResponse<{ mood: MoodId | null }>> {
  return apiClient.get<{ mood: MoodId | null }>('/user/mood');
}

export async function setMood(mood: MoodId | null): Promise<ApiResponse<{ mood: MoodId | null }>> {
  return mood
    ? apiClient.post<{ mood: MoodId }>('/user/mood', { mood })
    : apiClient.delete<{ mood: null }>('/user/mood');
}

export const userApi = {
  getUserProfile,
  updateUserProfile,
  getUserPreferences,
  updateUserPreferences,
  getListeningStats,
  getMood,
  setMood,
};

