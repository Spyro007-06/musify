import type { MoodId } from '@/types/user';

export interface Mood {
  id: MoodId;
  name: string;
  /** Chip label for the home screen mood check-in. */
  shortName: string;
  gradient: string;
}

export const MOODS: Mood[] = [
  { id: 'chill', name: 'Chill & Relax', shortName: 'Chill', gradient: 'from-blue-600 to-indigo-900' },
  { id: 'focus', name: 'Deep Focus', shortName: 'Focus', gradient: 'from-emerald-600 to-teal-900' },
  { id: 'workout', name: 'High Energy / Workout', shortName: 'Workout', gradient: 'from-orange-600 to-red-900' },
  { id: 'party', name: 'Party Vibes', shortName: 'Party', gradient: 'from-purple-600 to-pink-900' },
  { id: 'sleep', name: 'Sleep & Ambient', shortName: 'Sleep', gradient: 'from-slate-700 to-zinc-950' },
  { id: 'romance', name: 'Romance', shortName: 'Romance', gradient: 'from-rose-600 to-rose-950' },
];
