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
    // Keep showing the previous query's results while the next one loads,
    // instead of flashing skeletons on every keystroke pause.
    placeholderData: (previous) => previous,
  });
}
