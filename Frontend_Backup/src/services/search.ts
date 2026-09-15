import { apiClient } from "@/shared/services/api-client";
import type { SearchResult } from "@/types/music";

export const searchService = {
  search: async (query: string): Promise<SearchResult> => {
    if (!query.trim()) {
      return { tracks: [], albums: [], artists: [], playlists: [] };
    }
    const res = await apiClient.get<{ data: SearchResult }>("/search", {
      params: { q: query },
    });
    return res.data.data;
  },

  getSuggestions: async (query: string): Promise<string[]> => {
    if (!query.trim()) return [];
    const res = await apiClient.get<{ data: string[] }>("/search/suggestions", {
      params: { q: query },
    });
    return res.data.data;
  },
};
