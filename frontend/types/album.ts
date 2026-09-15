import { Artist } from './artist';
import { Track } from './track';

export interface Album {
  id: string;
  title: string;
  slug?: string;
  artworkUrl?: string | null;
  artwork?: string | null;
  releaseYear?: number;
  type?: string;
  genre?: string;
  artistId?: string;
  artist?: Partial<Artist>;
  artists?: Artist[];
  tracksCount?: number;
  tracks?: Track[];
  isLiked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
