"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
  selectedLanguages: string[];
  selectedArtists: string[];
  hasPickedPreferences: boolean;
  setPreferences: (languages: string[], artists: string[]) => void;
  resetPreferences: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      selectedLanguages: [],
      selectedArtists: [],
      hasPickedPreferences: false,

      setPreferences: (languages, artists) =>
        set({
          selectedLanguages: languages,
          selectedArtists: artists,
          hasPickedPreferences: true,
        }),

      resetPreferences: () =>
        set({
          selectedLanguages: [],
          selectedArtists: [],
          hasPickedPreferences: false,
        }),
    }),
    {
      name: "vibe-user-preferences-v2",
    }
  )
);
