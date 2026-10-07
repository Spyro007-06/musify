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
  artwork?: string | null;
  lyricsUrl?: string | null;
  genre?: string;
  playCount?: number;
  isExplicit?: boolean;
  albumId?: string;
  artists: Artist[];
  /** Who you hear: the singers, where the catalog says (its artists list often starts with the composer or lyricist). */
  performers?: Artist[];
  album?: Partial<Album>;
  isLiked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** `time` is seconds into the song; null when the lyrics aren't time-synced. */
export interface LyricLine {
  time: number | null;
  text: string;
}

export interface Lyrics {
  synced: boolean;
  instrumental: boolean;
  /** Empty when no lyrics exist for the song. */
  lines: LyricLine[];
}
