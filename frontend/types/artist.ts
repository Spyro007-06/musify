export interface Artist {
  id: string;
  name: string;
  slug?: string;
  bio?: string;
  imageUrl?: string | null;
  image?: string | null;
  isVerified?: boolean;
  country?: string;
  genres?: string[];
  followerCount?: number;
  followers?: number;
  popularity?: number;
  isFollowed?: boolean;
  isFollowing?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
