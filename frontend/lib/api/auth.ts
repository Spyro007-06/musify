import { apiClient } from './client';
import {
  AuthResponseData,
  RefreshResponseData,
  CsrfResponseData,
  LoginCredentials,
  SignupCredentials,
} from '@/types/auth';
import { User } from '@/types/user';
import { ApiResponse } from '@/types/api';

export const authApi = {
  getCsrfToken: async (): Promise<ApiResponse<CsrfResponseData>> => {
    return apiClient.get<CsrfResponseData>('/auth/csrf', {
      requiresAuth: false,
      requiresCsrf: false,
    });
  },

  signup: async (data: SignupCredentials): Promise<ApiResponse<AuthResponseData>> => {
    return apiClient.post<AuthResponseData>('/auth/signup', data, {
      requiresAuth: false,
    });
  },

  login: async (data: LoginCredentials): Promise<ApiResponse<AuthResponseData>> => {
    return apiClient.post<AuthResponseData>('/auth/login', data, {
      requiresAuth: false,
    });
  },

  logout: async (refreshToken?: string): Promise<ApiResponse<void>> => {
    return apiClient.post<void>('/auth/logout', refreshToken ? { refreshToken } : undefined);
  },

  refresh: async (refreshToken?: string): Promise<ApiResponse<RefreshResponseData>> => {
    return apiClient.post<RefreshResponseData>(
      '/auth/refresh',
      refreshToken ? { refreshToken } : undefined,
      { requiresAuth: false }
    );
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return apiClient.get<User>('/auth/me');
  },
};
