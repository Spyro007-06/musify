import { ImageResponse } from 'next/og';

/**
 * "My month on Musify": a 1080x1920 story card drawn from the stats the
 * stats page already has, POSTed as JSON (Library → Your Stats → Share).
 * Not under /api, which next.config rewrites to the backend.
 *
 * Anyone can POST here, so everything is capped, and artwork is drawn only
 * from JioSaavn's image CDN: satori fetches image URLs server-side, and an
 * open URL would let anyone point this server at any address.
 */

const MAX_BODY = 20_000;
const str = (v: unknown, max = 60) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);
/** Only JioSaavn artwork, at the 150px size the CDN already serves. */
const art = (v: unknown) =>
  typeof v === 'string' && /^https?:\/\/([a-z0-9-]+\.)*saavncdn\.com\//i.test(v)
    ? v.replace(/^http:/, 'https:').replace(/\b(50x50|150x150|500x500)\b/, '150x150')
    : null;
const list = (v: unknown, max = 5) => (Array.isArray(v) ? v.slice(0, max) : []) as Record<string, unknown>[];

const MINT = '#75e2c0';
const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return new Response('Too large', { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const month = /^\d{4}-\d{2}$/.test(str(body.month)) ? str(body.month) : new Date().toISOString().slice(0, 7);
  const [y, m] = month.split('-').map(Number);
  const monthName = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en', { month: 'long', timeZone: 'UTC' });
  const name = str(body.name, 30);
  const tracks = list(body.topTracks).map((t) => ({ title: str(t?.title), artist: str(t?.artist, 90), artwork: art(t?.artwork) }));
  const artists = list(body.topArtists, 3).map((a) => ({ name: str(a?.name, 30), image: art(a?.image) }));
  const languages = list(body.topLanguages, 3).map((l) => str(l?.name, 20)).filter(Boolean);
  const stats = [
    [num(body.minutesListened).toLocaleString('en'), 'minutes'],
    [num(body.plays).toLocaleString('en'), 'plays'],
    [num(body.uniqueArtists).toLocaleString('en'), 'artists'],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '96px 80px 80px',
          background: 'linear-gradient(160deg, #102d24 0%, #0b1210 45%, #000 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, letterSpacing: 6, color: MINT }}>MUSIFY</div>
        <div style={{ display: 'flex', fontSize: 44, color: '#a3a3a3', marginTop: 48 }}>{name ? `${name}’s` : 'My'}</div>
        <div style={{ display: 'flex', fontSize: 132, fontWeight: 800, lineHeight: 1.2, marginTop: 4 }}>{monthName}</div>
        <div style={{ display: 'flex', fontSize: 44, color: '#a3a3a3' }}>{`in music · ${y}`}</div>

        <div style={{ display: 'flex', gap: 24, marginTop: 56 }}>
          {stats.map(([value, label]) => (
            <div
              key={label}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 28, borderRadius: 32, background: 'rgba(255,255,255,0.06)' }}
            >
              <div style={{ display: 'flex', fontSize: 60, fontWeight: 800 }}>{value}</div>
              <div style={{ display: 'flex', fontSize: 30, color: '#a3a3a3' }}>{label}</div>
            </div>
          ))}
        </div>

        {tracks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56 }}>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: MINT, letterSpacing: 2 }}>TOP SONGS</div>
            {tracks.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 22 }}>
                <div style={{ display: 'flex', width: 44, fontSize: 40, fontWeight: 800, color: '#737373' }}>{i + 1}</div>
                <div style={{ display: 'flex', width: 104, height: 104, borderRadius: 20, background: '#1f2937', overflow: 'hidden' }}>
                  {t.artwork && <img src={t.artwork} width={104} height={104} alt="" />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', fontSize: 42, fontWeight: 700, ...ellipsis }}>{t.title}</div>
                  <div style={{ display: 'flex', fontSize: 32, color: '#a3a3a3', marginTop: 4, ...ellipsis }}>{t.artist}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {artists.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56 }}>
            <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, color: MINT, letterSpacing: 2 }}>TOP ARTISTS</div>
            <div style={{ display: 'flex', gap: 36, marginTop: 28 }}>
              {artists.map((a, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 280 }}>
                  <div style={{ display: 'flex', width: 160, height: 160, borderRadius: 80, background: '#1f2937', overflow: 'hidden' }}>
                    {a.image && <img src={a.image} width={160} height={160} alt="" />}
                  </div>
                  <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, marginTop: 16, maxWidth: 280, ...ellipsis }}>{a.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: 40, fontSize: 32 }}>
          <div style={{ display: 'flex', color: '#a3a3a3' }}>
            {languages.length > 0 ? `Mostly ${languages.map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}` : ''}
          </div>
          <div style={{ display: 'flex', color: MINT, fontWeight: 700 }}>{new URL(req.url).host}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
