'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserProfile,
  updateUserProfile,
  getUserPreferences,
  updateUserPreferences,
  UserPreferences,
  UpdateProfileRequest,
} from '@/lib/api/user';
import { useAuthStore } from '@/stores/auth-store';
import { User } from '@/types/user';

export function useUserProfile() {
  const { isAuthenticated, isInitializing } = useAuthStore();

  return useQuery<User | null, Error>({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const res = await getUserProfile();
      return res.data || null;
    },
    enabled: isAuthenticated && !isInitializing,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser, user: currentAuthUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      const res = await updateUserProfile(data);
      return res.data;
    },
    onSuccess: (updatedUser) => {
      if (updatedUser) {
        // Sync with TanStack cache
        queryClient.setQueryData(['user', 'profile'], updatedUser);
        
        // Sync with Zustand auth store so Topbar/UserMenu updates immediately
        if (currentAuthUser) {
          setUser({
            ...currentAuthUser,
            displayName: updatedUser.displayName,
            avatarUrl: updatedUser.avatarUrl,
            bio: updatedUser.bio,
          });
        }
      }
      // Invalidate currentUser queries so next session check has latest data
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

export function useUserPreferences() {
  const { isAuthenticated, isInitializing } = useAuthStore();

  return useQuery<UserPreferences, Error>({
    queryKey: ['user', 'preferences'],
    queryFn: async () => {
      const res = await getUserPreferences();
      return (
        res.data || {
          favouriteLanguages: [],
          favouriteAlbums: [],
          favouriteGenres: [],
          favouriteArtists: [],
          favouriteMoods: [],
        }
      );
    },
    enabled: isAuthenticated && !isInitializing,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: UserPreferences) => {
      await updateUserPreferences(preferences);
      return preferences;
    },
    onSuccess: (updatedPreferences) => {
      // Update local preference cache
      queryClient.setQueryData(['user', 'preferences'], updatedPreferences);
      queryClient.invalidateQueries({ queryKey: ['user', 'preferences'] });

      // Targeted invalidation of recommendation caches that depend on user preferences
      queryClient.invalidateQueries({ queryKey: ['music', 'recommended'] });
      queryClient.invalidateQueries({ queryKey: ['music', 'trending'] });
      queryClient.invalidateQueries({ queryKey: ['music', 'mood'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'recommendations'] });
    },
  });
}
