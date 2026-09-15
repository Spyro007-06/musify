export interface IArtist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  imageUrl: string | null;
  isVerified: boolean;
  country: string | null;
  genres: string[];
  followerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITrack {
  id: string;
  title: string;
  slug: string;
  durationSeconds: number;
  audioUrl: string;
  artworkUrl: string | null;
  lyricsUrl: string | null;
  genre: string | null;
  playCount: number;
  isExplicit: boolean;
  albumId: string | null;
  artists: IArtist[];
  album?: IAlbum | null;
  isLiked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAlbum {
  id: string;
  title: string;
  slug: string;
  artworkUrl: string | null;
  releaseYear: number | null;
  type: 'ALBUM' | 'SINGLE' | 'EP';
  genre: string | null;
  artistId: string;
  artist?: IArtist;
  tracksCount?: number;
  tracks?: ITrack[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlaylist {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  ownerId: string;
  tracksCount: number;
  tracks?: ITrack[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory {
  id: string;
  name: string;
  slug: string;
  coverUrl: string | null;
  gradient: string | null;
}

export interface ISearchResult {
  tracks: ITrack[];
  albums: IAlbum[];
  artists: IArtist[];
  playlists: IPlaylist[];
}

