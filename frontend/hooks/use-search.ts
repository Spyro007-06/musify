import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './use-debounce';
import { searchApi } from '@/lib/api/search';

export function useSearch(initialQuery = '', debounceMs = 300) {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, debounceMs);

  const searchResultsQuery = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return null;
      const res = await searchApi.search(debouncedQuery);
      return res.data;
    },
    enabled: !!debouncedQuery.trim(),
    staleTime: 1000 * 60 * 2, // 2 mins
  });

  const suggestionsQuery = useQuery({
    queryKey: ['suggestions', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const res = await searchApi.getSuggestions(debouncedQuery);
      return res.data || [];
    },
    enabled: !!debouncedQuery.trim(),
    staleTime: 1000 * 60 * 5,
  });

  return {
    query,
    setQuery,
    debouncedQuery,
    results: searchResultsQuery.data,
    suggestions: suggestionsQuery.data || [],
    isLoading: searchResultsQuery.isLoading,
    isError: searchResultsQuery.isError,
  };
}
