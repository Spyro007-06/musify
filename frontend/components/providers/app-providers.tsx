'use client';

import { ReactNode, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryProvider } from './query-provider';
import { useAudio } from '@/hooks/use-audio';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/types/api';
import { useCurrentUser } from '@/hooks/use-current-user';
import { clearCsrfToken } from '@/lib/auth/csrf';
import { clearSessionMarker, hadSession, markSessionActive } from '@/lib/auth/session-marker';
import { ToastViewport } from '@/components/ui/toast';
import { AppSplash } from '@/components/layout/app-splash';

function AudioEngineManager() {
  useAudio();

  useEffect(() => {
    usePlayerStore.getState().hydratePreferences();
  }, []);

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
            // The refresh above rotated the refreshToken cookie, which the
            // backend's CSRF check uses as its session identifier — the
            // cached CSRF token is now stale for any subsequent request.
            clearCsrfToken();
            markSessionActive();

            // /auth/refresh now returns the profile directly (the common
            // case) — set token+user atomically via setAuth so accessToken
            // never becomes truthy without a user alongside it, which would
            // otherwise enable useCurrentUser's own query and race it
            // against this flow. Only an older backend deploy omitting
            // `user` needs the separate GET /auth/me fallback below.
            if (res.data.user) {
              setAuth(res.data.user, res.data.accessToken);
              queryClient.setQueryData(['currentUser', res.data.accessToken], res.data.user);
            } else {
              setAccessToken(res.data.accessToken);
              const meRes = await authApi.getCurrentUser();
              if (mounted && meRes.data) {
                setAuth(meRes.data, res.data.accessToken);
                queryClient.setQueryData(['currentUser', res.data.accessToken], meRes.data);
              }
            }
          }
        } catch (err) {
          // Only an actual auth rejection (expired/invalid refresh token)
          // means there's truly no session to recover — stop retrying it.
          // A network hiccup or a cold-starting backend (very common on
          // mobile, where the app also gets backgrounded/killed and
          // relaunched far more often than a desktop tab) is not proof the
          // session is gone, and clearing the marker here would otherwise
          // permanently disable auto-login after one bad network blip.
          const isAuthRejection = err instanceof ApiError && err.status >= 400 && err.status < 500;
          if (isAuthRejection) {
            clearSessionMarker();
          }
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

  // Render children unconditionally and layer the splash on top instead of
  // swapping the tree for it — see AppSplash's doc comment for why.
  return (
    <>
      {children}
      {isInitializing && <AppSplash />}
    </>
  );
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
