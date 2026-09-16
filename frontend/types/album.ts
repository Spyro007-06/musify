import { Artist } from './artist';
import { Track } from './track';

export interface Album {
  id: string;
  title: string;
  slug?: string;
  artwork?: string | null;
  releaseYear?: number;
  type?: string;
  genre?: string;
  artistId?: string;
  artist?: Partial<Artist>;
  tracksCount?: number;
  tracks?: Track[];
  isLiked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
