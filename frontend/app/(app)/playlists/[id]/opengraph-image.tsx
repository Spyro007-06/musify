import { ImageResponse } from 'next/og';
import { fetchPublicPlaylist } from '@/lib/api/public-playlist';

export const alt = 'A playlist on MUSIFY';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The link-preview card: cover on the left, name and details on the right. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playlist = await fetchPublicPlaylist(id);
  const cover = playlist?.cover || playlist?.tracks?.[0]?.artwork || null;
  const count = playlist?.tracksCount ?? playlist?.tracks?.length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 56,
          padding: 72,
          background: 'linear-gradient(135deg, #102d24 0%, #0b1210 55%, #000 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img>
          <img src={cover} width={440} height={440} alt="" style={{ borderRadius: 28, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 440, height: 440, borderRadius: 28, background: '#1f2937', display: 'flex' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 28, color: '#75e2c0', fontWeight: 700, letterSpacing: 4 }}>PLAYLIST</div>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, marginTop: 16, display: 'flex' }}>
            {(playlist?.title || 'Listen on MUSIFY').slice(0, 60)}
          </div>
          {playlist && (
            <div style={{ fontSize: 30, color: '#a3a3a3', marginTop: 24 }}>
              {`${playlist.owner || 'MUSIFY'} · ${count} ${count === 1 ? 'song' : 'songs'}`}
            </div>
          )}
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 48, letterSpacing: 2 }}>MUSIFY</div>
        </div>
      </div>
    ),
    size
  );
}
