export interface Artist {
  id: string;
  name: string;
  slug?: string;
  bio?: string;
  image?: string | null;
  isVerified?: boolean;
  country?: string;
  genres?: string[];
  followers?: number;
  popularity?: number;
  isFollowing?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
