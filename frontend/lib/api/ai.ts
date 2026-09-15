import { apiClient } from './client';
import { Playlist } from '@/types/playlist';
import { ApiResponse } from '@/types/api';

export interface GeneratePlaylistParams {
  prompt: string;
  mood?: string;
  count?: number;
}

export interface LyricsAnalysis {
  meaning?: string;
  sentiment?: string;
  vibes?: string[];
  explanation?: string;
}

export const aiApi = {
  generatePlaylist: (params: GeneratePlaylistParams) =>
    apiClient<ApiResponse<Playlist>>('/ai/generate-playlist', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  analyzeLyrics: (trackId: string) =>
    apiClient<ApiResponse<LyricsAnalysis>>(`/ai/lyrics/${trackId}`),
};
