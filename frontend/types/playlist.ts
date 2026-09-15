import { Track } from './track';
import { User } from './user';

export interface Playlist {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  coverUrl?: string | null;
  cover?: string | null;
  isPublic: boolean;
  ownerId?: string;
  owner?: Partial<User> | string;
  tracksCount?: number;
  tracks?: Track[];
  createdAt?: string;
  updatedAt?: string;
}
