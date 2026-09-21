'use client';

import { ReactNode, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryProvider } from './query-provider';
import { useAudio } from '@/hooks/use-audio';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { useCurrentUser } from '@/hooks/use-current-user';
import { clearCsrfToken } from '@/lib/auth/csrf';
import { clearSessionMarker, hadSession, markSessionActive } from '@/lib/auth/session-marker';
import { ToastViewport } from '@/components/ui/toast';
import { AppSplash } from '@/components/layout/app-splash';

function AudioEngineManager() {
  useAudio();
  return null;
}

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Offline shell is a nice-to-have; a failed registration shouldn't affect the app.
      });
    }
  }, []);
  return null;
}

function SessionInitializer({ children }: { children: ReactNode }) {
  const { accessToken, isInitializing, setAuth, setAccessToken, setInitializing } = useAuthStore();
  const queryClient = useQueryClient();
  useCurrentUser();

  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      // If we don't have an access token, attempt a silent token refresh via HTTP-only cookie —
      // but only if this browser has ever actually had a session. A brand-new guest has no
      // refresh cookie at all, so skip the doomed round-trip entirely for them.
      if (!accessToken && hadSession()) {
        try {
          const res = await authApi.refresh();
          if (mounted && res.data?.accessToken) {
            // Make the token available to apiClient (which reads it live from
            // the store) BEFORE the next call, so getCurrentUser() actually
            // sends it instead of firing unauthenticated and 401ing.
            setAccessToken(res.data.accessToken);
            // The refresh above rotated the refreshToken cookie, which the
            // backend's CSRF check uses as its session identifier — the
            // cached CSRF token is now stale for any subsequent request.
            clearCsrfToken();
            markSessionActive();
            const meRes = await authApi.getCurrentUser();
            if (mounted && meRes.data) {
              setAuth(meRes.data, res.data.accessToken);
              // Seed useCurrentUser's cache for this token so it doesn't
              // immediately re-fetch /auth/me once it becomes enabled.
              queryClient.setQueryData(['currentUser', res.data.accessToken], meRes.data);
            }
          }
        } catch {
          // No active session cookie or invalid token; proceed as guest, and
          // stop treating this browser as having a session to retry next time.
          clearSessionMarker();
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
  }, [accessToken, setAuth, setAccessToken, setInitializing, queryClient]);

  if (isInitializing) {
    return <AppSplash />;
  }

  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <SessionInitializer>
        <AudioEngineManager />
        <ServiceWorkerRegistrar />
        {children}
        <ToastViewport />
      </SessionInitializer>
    </QueryProvider>
  );
}
