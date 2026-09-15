export type Artist = {
  id: string;
  name: string;
  image?: string;
  followers?: number;
  isVerified?: boolean;
  genres?: string[];
  bio?: string;
};

export type Album = {
  id: string;
  title: string;
  artist: Artist;
  artwork?: string;
  releaseYear?: number;
  tracksCount?: number;
  genre?: string;
  type?: "album" | "single" | "ep";
};

export type Track = {
  id: string;
  title: string;
  duration: number; // seconds
  artwork?: string;
  audioUrl: string;
  artists: Artist[];
  album?: Album;
  genre?: string;
  isLiked?: boolean;
  playCount?: number;
  lyricsUrl?: string;
};

export type Playlist = {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  tracksCount: number;
  owner?: string;
  isPublic?: boolean;
  tracks?: Track[];
};

export type SearchResult = {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
};

export type Category = {
  id: string;
  name: string;
  cover?: string;
  gradient?: string;
};
