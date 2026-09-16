import { apiClient } from './client';
import { ApiResponse } from '@/types/api';

export interface UserPreferences {
  favouriteLanguages?: string[];
  favouriteAlbums?: string[];
  favouriteGenres?: string[];
  favouriteArtists?: string[];
  favouriteMoods?: string[];
}

export const userApi = {
  getUserPreferences: (): Promise<ApiResponse<UserPreferences>> =>
    apiClient.get<UserPreferences>('/user/preferences'),

  updateUserPreferences: (preferences: UserPreferences): Promise<ApiResponse<void>> =>
    apiClient.post<void>('/user/preferences', preferences),
};
