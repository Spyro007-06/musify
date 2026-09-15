import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  queueOpen: boolean;
  lyricsOpen: boolean;

  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setQueueOpen: (open: boolean) => void;
  toggleQueue: () => void;
  setLyricsOpen: (open: boolean) => void;
  toggleLyrics: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  queueOpen: false,
  lyricsOpen: false,

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setQueueOpen: (open) => set({ queueOpen: open }),
  toggleQueue: () => set((state) => ({ queueOpen: !state.queueOpen })),
  setLyricsOpen: (open) => set({ lyricsOpen: open }),
  toggleLyrics: () => set((state) => ({ lyricsOpen: !state.lyricsOpen })),
}));
