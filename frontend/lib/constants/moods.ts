export interface Mood {
  id: string;
  name: string;
  gradient: string;
}

export const MOODS: Mood[] = [
  { id: 'chill', name: 'Chill & Relax', gradient: 'from-blue-600 to-indigo-900' },
  { id: 'focus', name: 'Deep Focus', gradient: 'from-emerald-600 to-teal-900' },
  { id: 'workout', name: 'High Energy / Workout', gradient: 'from-orange-600 to-red-900' },
  { id: 'party', name: 'Party Vibes', gradient: 'from-purple-600 to-pink-900' },
  { id: 'sleep', name: 'Sleep & Ambient', gradient: 'from-slate-700 to-zinc-950' },
  { id: 'romance', name: 'Romance', gradient: 'from-rose-600 to-rose-950' },
];
