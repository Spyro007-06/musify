"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  activeModal: string | null;
  theme: "dark" | "light";

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  setTheme: (theme: "dark" | "light") => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      isMobileMenuOpen: false,
      activeModal: null,
      theme: "dark",

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "vibe-ui",
      partialize: (state) => ({ isSidebarOpen: state.isSidebarOpen, theme: state.theme }),
    }
  )
);
