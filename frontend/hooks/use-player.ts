import { usePlayerStore } from '@/stores/player-store';

export function usePlayer() {
  return usePlayerStore();
}
