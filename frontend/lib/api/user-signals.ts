import { apiClient } from './client';
import { ApiResponse } from '@/types/api';
import {
  LogPlayHistoryPayload,
  LogLikePayload,
  LogDislikePayload,
  LogSkipPayload,
} from '@/types/user';

/**
 * Behavioral signals consumed by the recommendation engine.
 * All require auth; none have a UI caller yet except history/skip logging
 * wired from the player (see hooks/use-audio.ts, stores/player-store.ts).
 */
export const userSignalsApi = {
  logPlayHistory: (payload: LogPlayHistoryPayload): Promise<ApiResponse<void>> =>
    apiClient.post<void>('/user/history', payload),

  /**
   * Song/album/artist like. Track likes are already logged via
   * POST /music/tracks/:id/like (see lib/api/music.ts), which writes to the
   * same LikedTrack table — do not call this for songs as well.
   */
  logLike: (payload: LogLikePayload): Promise<ApiResponse<void>> =>
    apiClient.post<void>('/user/likes', payload),

  logDislike: (payload: LogDislikePayload): Promise<ApiResponse<void>> =>
    apiClient.post<void>('/user/dislikes', payload),

  logSkip: (payload: LogSkipPayload): Promise<ApiResponse<void>> =>
    apiClient.post<void>('/user/skip', payload),
};
