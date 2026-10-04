import type { Playlist } from '@/types/playlist';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * Server-side only: a playlist as a logged-out visitor sees it, for link
 * previews. Null when it's private, missing, or the backend is unreachable.
 */
export async function fetchPublicPlaylist(id: string): Promise<Playlist | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/playlists/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return ((await res.json()) as { data?: Playlist }).data ?? null;
  } catch {
    return null;
  }
}
