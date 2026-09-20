'use client';

import { BASE_URL } from '@/lib/api/client';
import { toast } from '@/stores/toast-store';
import { Track } from '@/types/track';

/**
 * Triggers a real browser download of the track's audio file. Navigates to
 * the backend's download route rather than fetching + blob-saving — the
 * server responds with Content-Disposition: attachment, which every
 * browser honors as a save-to-disk regardless of the request being
 * cross-origin (a plain navigation isn't subject to CORS the way a fetch
 * read would be).
 */
export function useDownloadTrack() {
  return (track: Pick<Track, 'id' | 'title'>) => {
    const link = document.createElement('a');
    link.href = `${BASE_URL}/music/tracks/${encodeURIComponent(track.id)}/download`;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(`Downloading "${track.title}"…`);
  };
}
