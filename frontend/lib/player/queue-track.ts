import { usePlayerStore } from '@/stores/player-store';
import { addToHostQueue } from '@/stores/together-store';
import { toast } from '@/stores/toast-store';
import { Track } from '@/types/track';

/** "Add to queue" from any song, with Spotify's "Added to queue · Open" confirmation. */
export function queueTrack(track: Track) {
  // In a friend's Listen Together session, it goes to their queue.
  if (addToHostQueue(track)) return;
  const player = usePlayerStore.getState();
  if (player.addToQueue(track) === 'queued') {
    toast.success(`Added "${track.title}" to queue`, undefined, {
      label: 'Open',
      onClick: () => player.setQueueOpen(true),
    });
  }
}
