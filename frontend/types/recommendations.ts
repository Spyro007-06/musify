import { Track } from './track';
import { Album } from './album';
import { Artist } from './artist';

export type RecommendationSectionType = 
  | 'continue-listening' 
  | 'recently-played' 
  | 'daily-mix' 
  | 'discover-weekly' 
  | 'mood-boost' 
  | 'top-artists';

export interface RecommendationSection {
  id: string;
  type: RecommendationSectionType;
  title: string;
  subtitle?: string;
  items: (Track | Album | Artist)[];
}
