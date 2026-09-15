import { create } from 'zustand';
import { User } from '@/types/user';
import { clearCsrfToken } from '@/lib/auth/csrf';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  csrfToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;

  setAuth: (user: User, accessToken?: string, refreshToken?: string) => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setCsrfToken: (token: string | null) => void;
  setInitializing: (isInitializing: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  csrfToken: null,
  isAuthenticated: false,
  isInitializing: true,

  setAuth: (user, accessToken, refreshToken) => {
    set({
      user,
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      isAuthenticated: true,
      isInitializing: false,
    });
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  setAccessToken: (accessToken) => {
    set({
      accessToken,
      isAuthenticated: !!accessToken,
    });
  },

  setRefreshToken: (refreshToken) => {
    set({ refreshToken });
  },

  setCsrfToken: (csrfToken) => {
    set({ csrfToken });
  },

  setInitializing: (isInitializing) => {
    set({ isInitializing });
  },

  logout: () => {
    clearCsrfToken();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      csrfToken: null,
      isAuthenticated: false,
      isInitializing: false,
    });
  },
}));
