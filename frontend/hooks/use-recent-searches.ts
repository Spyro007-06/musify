'use client';

import * as React from 'react';
import { Track } from '@/types/track';

/** Something the user opened from search results — Spotify's "Recent searches". */
export interface RecentSearch {
  type: 'song' | 'artist' | 'album' | 'playlist';
  id: string;
  title: string;
  subtitle: string;
  image?: string | null;
  /** Songs keep their track so tapping the entry plays it straight away. */
  track?: Track;
}

const STORAGE_KEY = 'musify_recent_searches';
const MAX_ITEMS = 12;

function load(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

function save(items: RecentSearch[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private mode / full storage: recents just won't persist.
  }
}

// ponytail: per-device (localStorage). Move to the backend's searchHistory
// table if recents should follow the user across devices like Spotify's.
export function useRecentSearches() {
  const [items, setItems] = React.useState<RecentSearch[]>([]);

  // Read after mount: the server render has no localStorage.
  React.useEffect(() => setItems(load()), []);

  const update = React.useCallback((next: (prev: RecentSearch[]) => RecentSearch[]) => {
    setItems((prev) => {
      const value = next(prev);
      save(value);
      return value;
    });
  }, []);

  const add = React.useCallback(
    (item: RecentSearch) =>
      update((prev) => [item, ...prev.filter((p) => !(p.type === item.type && p.id === item.id))].slice(0, MAX_ITEMS)),
    [update]
  );
  const remove = React.useCallback(
    (item: RecentSearch) => update((prev) => prev.filter((p) => !(p.type === item.type && p.id === item.id))),
    [update]
  );
  const clear = React.useCallback(() => update(() => []), [update]);

  return { items, add, remove, clear };
}
