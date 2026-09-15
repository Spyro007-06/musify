import { apiClient } from './client';
import { User, UserPreferences } from '@/types/user';
import { Track } from '@/types/track';
import { Album } from '@/types/album';
import { ApiResponse } from '@/types/api';

export const userApi = {
  getProfile: () => apiClient<ApiResponse<User>>('/user/profile'),
  updateProfile: (data: Partial<User>) =>
    apiClient<ApiResponse<User>>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getPreferences: () => apiClient<ApiResponse<UserPreferences>>('/user/preferences'),
  updatePreferences: (data: Partial<UserPreferences>) =>
    apiClient<ApiResponse<UserPreferences>>('/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getLikedSongs: () => apiClient<ApiResponse<Track[]>>('/user/liked-tracks'),
  getLikedAlbums: () => apiClient<ApiResponse<Album[]>>('/user/liked-albums'),
  getRecentlyPlayed: () => apiClient<ApiResponse<Track[]>>('/user/recently-played'),
};
