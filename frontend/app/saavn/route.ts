/**
 * JioSaavn relay in Mumbai. JioSaavn serves a smaller catalog outside India
 * (from the backend's Singapore host, "Starboy" finds only karaoke covers),
 * so the backend sends its JioSaavn calls here instead (SAAVN_PROXY_URL).
 * Only ever forwards to JioSaavn's api.php, with the caller's query string.
 * It must run in Mumbai: frontend/vercel.json pins the project's functions to
 * bom1 (a per-route preferredRegion is ignored on the Hobby plan — it ran in
 * iad1, where JioSaavn's catalog is just as small).
 */
export const dynamic = 'force-dynamic';

const JIOSAAVN_API = 'https://www.jiosaavn.com/api.php';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

export async function GET(request: Request) {
  // Shared key (SAAVN_PROXY_KEY, same value on the backend) so nobody else
  // can use this as their JioSaavn relay. Optional only in local dev.
  const key = process.env.SAAVN_PROXY_KEY;
  if (!key && process.env.NODE_ENV === 'production') {
    return new Response('Relay not configured', { status: 503 });
  }
  if (key && request.headers.get('x-saavn-proxy-key') !== key) {
    return new Response('Forbidden', { status: 403 });
  }

  const { search } = new URL(request.url);
  if (!search.includes('__call=')) return new Response('Bad request', { status: 400 });

  const upstream = await fetch(`${JIOSAAVN_API}${search}`, {
    headers: { 'User-Agent': request.headers.get('user-agent') || USER_AGENT },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!upstream) return new Response('JioSaavn unreachable', { status: 502 });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
  });
}
