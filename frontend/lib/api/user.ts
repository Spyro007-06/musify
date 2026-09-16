import { apiClient } from './client';
import { ApiResponse } from '@/types/api';
import { User, UpdateProfileRequest, UserPreferences } from '@/types/user';

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

export const userApi = {
  getUserProfile,
  updateUserProfile,
  getUserPreferences,
  updateUserPreferences,
};

