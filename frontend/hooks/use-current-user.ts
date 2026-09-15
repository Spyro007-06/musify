'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect } from 'react';
import { User } from '@/types/user';

export function useCurrentUser() {
  const { isAuthenticated, accessToken, setUser, setInitializing } = useAuthStore();

  const query = useQuery<User | null>({
    queryKey: ['currentUser', accessToken],
    queryFn: async () => {
      try {
        const res = await authApi.getCurrentUser();
        return res.data || null;
      } catch {
        return null;
      }
    },
    enabled: !!accessToken || isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
    if (!query.isLoading) {
      setInitializing(false);
    }
  }, [query.data, query.isLoading, setUser, setInitializing]);

  return {
    user: query.data || useAuthStore.getState().user,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
