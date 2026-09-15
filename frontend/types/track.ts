import { Artist } from './artist';
import { Album } from './album';

export interface Track {
  id: string;
  title: string;
  slug?: string;
  durationSeconds?: number;
  duration?: number;
  durationMs?: number;
  audioUrl?: string | null;
  artworkUrl?: string | null;
  artwork?: string | null;
  lyricsUrl?: string | null;
  genre?: string;
  playCount?: number;
  isExplicit?: boolean;
  albumId?: string;
  artists: Artist[];
  album?: Partial<Album>;
  isLiked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
