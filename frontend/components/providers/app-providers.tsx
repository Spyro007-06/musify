'use client';

import { ReactNode, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryProvider } from './query-provider';
import { useAudio } from '@/hooks/use-audio';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { useCurrentUser } from '@/hooks/use-current-user';

function AudioEngineManager() {
  useAudio();
  return null;
}

function SessionInitializer({ children }: { children: ReactNode }) {
  const { accessToken, setAuth, setInitializing } = useAuthStore();
  const queryClient = useQueryClient();
  useCurrentUser();

  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      // If we don't have an access token, attempt a silent token refresh via HTTP-only cookie
      if (!accessToken) {
        try {
          const res = await authApi.refresh();
          if (mounted && res.data?.accessToken) {
            const meRes = await authApi.getCurrentUser();
            if (mounted && meRes.data) {
              setAuth(meRes.data, res.data.accessToken);
              // Seed useCurrentUser's cache for this token so it doesn't
              // immediately re-fetch /auth/me once it becomes enabled.
              queryClient.setQueryData(['currentUser', res.data.accessToken], meRes.data);
            }
          }
        } catch {
          // No active session cookie or invalid token; proceed as guest
        } finally {
          if (mounted) {
            setInitializing(false);
          }
        }
      } else {
        if (mounted) {
          setInitializing(false);
        }
      }
    }

    initializeSession();

    return () => {
      mounted = false;
    };
  }, [accessToken, setAuth, setInitializing, queryClient]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SessionInitializer>
        <AudioEngineManager />
        {children}
      </SessionInitializer>
    </QueryProvider>
  );
}
