'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { LoginCredentials, SignupCredentials } from '@/types/auth';
import { clearSessionMarker, markSessionActive } from '@/lib/auth/session-marker';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isInitializing,
    setAuth,
    setCsrfToken,
    logout: storeLogout,
  } = useAuthStore();

  const login = async (credentials: LoginCredentials, targetRedirect = '/home') => {
    // 1. Call login
    const res = await authApi.login(credentials);
    const token = res.data?.accessToken;
    let loggedUser = res.data?.user;

    // 2. Ensure CSRF is initialized
    try {
      const csrfRes = await authApi.getCsrfToken();
      if (csrfRes.data?.csrfToken) {
        setCsrfToken(csrfRes.data.csrfToken);
      }
    } catch {
      // ignore
    }

    // 3. Set auth in store
    if (loggedUser && token) {
      setAuth(loggedUser, token);
      markSessionActive();
    }

    // 4. Fetch full me profile if needed
    try {
      const meRes = await authApi.getCurrentUser();
      if (meRes.data) {
        loggedUser = meRes.data;
        if (token) setAuth(loggedUser, token);
      }
    } catch {
      // ignore
    }

    // 5. Update currentUser query cache
    if (loggedUser) {
      queryClient.setQueryData(['currentUser', token], loggedUser);
    }

    // 6. Redirect into app to the intended destination
    router.push(targetRedirect);
    return res;
  };

  const signup = async (credentials: SignupCredentials, targetRedirect = '/home') => {
    const res = await authApi.signup({
      ...credentials,
      role: credentials.role || 'USER',
    });

    const token = res.data?.accessToken;
    let signedUser = res.data?.user;

    if (token && signedUser) {
      try {
        const csrfRes = await authApi.getCsrfToken();
        if (csrfRes.data?.csrfToken) {
          setCsrfToken(csrfRes.data.csrfToken);
        }
      } catch {
        // ignore
      }

      setAuth(signedUser, token);
      markSessionActive();

      try {
        const meRes = await authApi.getCurrentUser();
        if (meRes.data) {
          signedUser = meRes.data;
          setAuth(signedUser, token);
        }
      } catch {
        // ignore
      }

      queryClient.setQueryData(['currentUser', token], signedUser);
      router.push(targetRedirect);
    } else {
      router.push('/login');
    }

    return res;
  };

  const logout = async () => {
    try {
      await authApi.logout(refreshToken || undefined);
    } catch {
      // ignore
    } finally {
      storeLogout();
      clearSessionMarker();
      queryClient.clear();
      router.push('/');
    }
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    isInitializing,
    login,
    signup,
    logout,
  };
}
