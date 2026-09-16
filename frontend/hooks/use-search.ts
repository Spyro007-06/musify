'use client';

import { useQuery } from '@tanstack/react-query';
import { searchApi, SearchResults } from '@/lib/api/search';

/**
 * Hook to query full search results for a submitted or debounced search query.
 */
export function useSearchQuery(query: string) {
  const trimmed = query.trim();

  return useQuery<SearchResults | null>({
    queryKey: ['search', trimmed],
    queryFn: async () => {
      if (!trimmed) return null;
      const res = await searchApi.search(trimmed);
      return res.data || { tracks: [], artists: [], albums: [], playlists: [] };
    },
    enabled: !!trimmed,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to query autocomplete suggestions while typing.
 * Only triggers if query length is >= 2 chars.
 */
export function useSearchSuggestions(query: string) {
  const trimmed = query.trim();

  return useQuery<string[]>({
    queryKey: ['search-suggestions', trimmed],
    queryFn: async () => {
      if (!trimmed || trimmed.length < 2) return [];
      const res = await searchApi.getSuggestions(trimmed);
      return res.data || [];
    },
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false,
  });
}
