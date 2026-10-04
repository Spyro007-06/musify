import type { Metadata } from 'next';
import { fetchPublicPlaylist } from '@/lib/api/public-playlist';

// Server wrapper around the (client) playlist page so a shared link unfurls
// with the playlist's name and cover (the image is opengraph-image.tsx).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const playlist = await fetchPublicPlaylist(id);
  if (!playlist) return { title: 'Playlist · MUSIFY' };

  const count = playlist.tracksCount ?? playlist.tracks?.length ?? 0;
  const description =
    playlist.description?.replace(/\s+/g, ' ').trim() ||
    `${count} ${count === 1 ? 'song' : 'songs'} · by ${playlist.owner || 'MUSIFY'} · Listen on MUSIFY`;
  return {
    title: `${playlist.title} · MUSIFY`,
    description,
    openGraph: { title: playlist.title, description, type: 'music.playlist', siteName: 'MUSIFY' },
    twitter: { card: 'summary_large_image', title: playlist.title, description },
  };
}

export default function PlaylistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
