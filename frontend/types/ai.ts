import { Track } from './track';

export interface AIRecommendationItem {
  spotifyTrackId: string;
  score: number;
  reason: string;
}

export interface GenerateAIPlaylistRequest {
  prompt: string;
  playlistName?: string;
}

export interface GenerateAIPlaylistSuccess {
  playlistId: string;
  title: string;
  trackCount: number;
  message?: string;
}

export interface GenerateAIPlaylistUnrecognized {
  playlistId: null;
  title: null;
  trackCount: 0;
  tracks: Track[];
  message: string;
}

export type GenerateAIPlaylistResult =
  | GenerateAIPlaylistSuccess
  | GenerateAIPlaylistUnrecognized;
