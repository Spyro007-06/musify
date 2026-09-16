import { Track } from './track';

export interface Playlist {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  cover?: string | null;
  isPublic: boolean;
  ownerId?: string;
  owner?: string;
  tracksCount?: number;
  tracks?: Track[];
  createdAt?: string;
  updatedAt?: string;
}
