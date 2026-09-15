"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/auth";

// Helper: sync token to a cookie so Next.js middleware can read it server-side
const setAuthCookie = (token: string | null) => {
  if (typeof document === "undefined") return;
  if (token) {
    // 7-day expiry, SameSite=Strict for security
    document.cookie = `access_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
  } else {
    document.cookie = "access_token=; path=/; max-age=0; SameSite=Strict";
  }
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setAccessToken: (token: string) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", accessToken);
          setAuthCookie(accessToken);
        }
        set({ user, accessToken, isAuthenticated: true });
      },

      setAccessToken: (accessToken) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", accessToken);
          setAuthCookie(accessToken);
        }
        set({ accessToken });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          setAuthCookie(null);
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: "vibe-auth",
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        // Re-sync cookie when Zustand rehydrates from localStorage
        if (state?.accessToken) {
          setAuthCookie(state.accessToken);
        }
      },
    }
  )
);

