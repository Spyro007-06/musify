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
    // Only this hook's own (enabled) fetch finishing means anything here.
    // When disabled — no accessToken/isAuthenticated yet, i.e. still booting —
    // query.isLoading is trivially false (nothing is fetching), which used to
    // clear isInitializing before SessionInitializer's silent-refresh had a
    // chance to resolve, sending every cold app-open through a login flash.
    if ((accessToken || isAuthenticated) && !query.isLoading) {
      setInitializing(false);
    }
  }, [query.data, query.isLoading, accessToken, isAuthenticated, setUser, setInitializing]);

  return {
    user: query.data || useAuthStore.getState().user,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
