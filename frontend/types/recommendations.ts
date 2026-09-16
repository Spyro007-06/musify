import { Track } from './track';
import { Album } from './album';
import { Artist } from './artist';
import { Category } from './category';

export type RecommendationSectionType = 'tracks' | 'albums' | 'artists' | 'categories';

export interface DashboardRecommendationSection {
  id: string;
  title: string;
  subtitle?: string;
  type: RecommendationSectionType;
  items: (Track | Album | Artist | Category)[];
}

export type RecommendationSection = DashboardRecommendationSection;

export interface RecommendationFeedbackPayload {
  trackId: string;
  action: 'complete' | 'skip' | 'replay';
  duration?: number;
  skipTime?: number;
}

export interface SmartQueuePayload {
  trackId: string;
  artistName: string;
  genre?: string;
  mood?: string;
}
