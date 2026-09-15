import { Track } from '@/types/track';

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getTrackArtists(track: Track): string {
  if (!track.artists || track.artists.length === 0) return 'Unknown Artist';
  return track.artists.map((a) => a.name).join(', ');
}
