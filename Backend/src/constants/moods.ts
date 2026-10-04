/** Same ids as the frontend's lib/constants/moods.ts. */
export const MOODS = ['chill', 'focus', 'workout', 'party', 'sleep', 'romance'] as const;
export type Mood = (typeof MOODS)[number];

/** Catalog search term per mood ("romance" alone mostly finds film titles). */
export const MOOD_SEARCH_TERMS: Record<Mood, string> = {
  chill: 'chill',
  focus: 'lofi focus',
  workout: 'workout',
  party: 'party',
  sleep: 'sleep',
  romance: 'romantic',
};
