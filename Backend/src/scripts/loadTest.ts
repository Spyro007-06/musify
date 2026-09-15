/**
 * Load-test scaffold for the hot paths most likely to fall over first: the
 * recommendation engine (precomputed-score read + live diversity filtering),
 * track/stream hydration (round-trips to the external Saavn API), search,
 * and the write-heavy feedback endpoints that invalidate the recommendation
 * cache on every call.
 *
 * This does NOT run anywhere automatically — it's a tool for someone to
 * point at a real running instance (local against a seeded DB, staging, or
 * a pre-prod copy) before trusting defaults in RECOMMENDATIONS.md at real
 * traffic levels. Never point this at production.
 *
 * Usage:
 *   npm run loadtest -- --url=http://localhost:3001 --duration=30 --connections=20 \
 *     --token=<jwt> --trackId=<real spotifyTrackId> --playlistId=<real playlist id> \
 *     --csrfCookie=<value> --csrfToken=<value>
 *
 * --token is required for the authenticated GET scenarios and for the POST
 * scenarios (which also need --csrfCookie/--csrfToken — see
 * `curl -c cookies.txt http://localhost:3001/api/auth/csrf`, the cookie
 * jar's x-csrf-token value and the response body's csrfToken are what to
 * pass). Without these, those scenarios are skipped rather than silently
 * measuring 401/403 responses as if they were real throughput.
 */
import autocannon, { type Result } from 'autocannon';

const args = process.argv.slice(2);
const getArg = (name: string, fallback: string): string => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : fallback;
};

const BASE_URL = getArg('url', 'http://localhost:3001');
const DURATION_SECONDS = Number(getArg('duration', '20'));
const CONNECTIONS = Number(getArg('connections', '10'));
const TOKEN = getArg('token', '');
const TRACK_ID = getArg('trackId', '');
const PLAYLIST_ID = getArg('playlistId', '');
const CSRF_COOKIE = getArg('csrfCookie', '');
const CSRF_TOKEN = getArg('csrfToken', '');

interface ScenarioSummary {
  label: string;
  rps: number;
  p50: number;
  p95: number;
  p99: number;
  errors: number;
}

const summaries: ScenarioSummary[] = [];

function printResult(label: string, result: Result): void {
  console.log(`\n--- ${label} ---`);
  console.log(`Requests/sec: ${result.requests.average.toFixed(1)} (min ${result.requests.min}, max ${result.requests.max})`);
  console.log(`Latency (ms): p50=${result.latency.p50} p95(~p97.5)=${result.latency.p97_5} p99=${result.latency.p99} max=${result.latency.max}`);
  console.log(`2xx: ${result['2xx']}  Non-2xx/errors: ${result.non2xx + result.errors}`);
  if (result.non2xx + result.errors > 0) {
    console.warn(`⚠️  ${result.non2xx + result.errors} non-2xx/error responses — check server logs for that window.`);
  }
  summaries.push({
    label,
    rps: result.requests.average,
    p50: result.latency.p50,
    p95: result.latency.p97_5,
    p99: result.latency.p99,
    errors: result.non2xx + result.errors,
  });
}

interface ScenarioOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

async function runScenario(label: string, path: string, opts: ScenarioOptions = {}): Promise<void> {
  const result = await autocannon({
    url: `${BASE_URL}${path}`,
    duration: DURATION_SECONDS,
    connections: CONNECTIONS,
    method: opts.method ?? 'GET',
    headers: opts.headers ?? {},
    body: opts.body,
  });
  printResult(label, result);
}

async function main() {
  console.log(`Load testing ${BASE_URL} — ${CONNECTIONS} connections for ${DURATION_SECONDS}s per scenario.`);

  await runScenario('Health (readiness)', '/api/health/ready');
  await runScenario('GET /api/music/trending', '/api/music/trending');
  await runScenario('GET /api/search?q=love', '/api/search?q=love');
  await runScenario('GET /api/search/suggestions?q=lo', '/api/search/suggestions?q=lo');

  if (TRACK_ID) {
    await runScenario(`GET /api/music/tracks/:id`, `/api/music/tracks/${TRACK_ID}`);
    await runScenario(`GET /api/music/tracks/:id/stream`, `/api/music/tracks/${TRACK_ID}/stream`);
  } else {
    console.log('\n(Skipped track/stream scenarios — pass --trackId=<real spotifyTrackId>.)');
  }

  if (PLAYLIST_ID) {
    await runScenario('GET /api/playlists/:id', `/api/playlists/${PLAYLIST_ID}`);
  } else {
    console.log('\n(Skipped playlist scenario — pass --playlistId=<real playlist id>.)');
  }

  if (TOKEN) {
    const authHeaders = { authorization: `Bearer ${TOKEN}` };
    await runScenario('GET /api/recommendations (authenticated, the hot path)', '/api/recommendations', { headers: authHeaders });
    await runScenario('GET /api/recommendations/discover', '/api/recommendations/discover', { headers: authHeaders });

    if (CSRF_COOKIE && CSRF_TOKEN && TRACK_ID) {
      const writeHeaders = {
        ...authHeaders,
        'content-type': 'application/json',
        'x-csrf-token': CSRF_TOKEN,
        cookie: `x-csrf-token=${CSRF_COOKIE}`,
      };
      await runScenario(
        'POST /api/user/history (write-heavy, invalidates recommendation cache)',
        '/api/user/history',
        { method: 'POST', headers: writeHeaders, body: JSON.stringify({ spotifyTrackId: TRACK_ID, completedSong: true, listenPercentage: 100 }) }
      );
      await runScenario(
        'POST /api/user/likes (write-heavy, invalidates recommendation cache)',
        '/api/user/likes',
        { method: 'POST', headers: writeHeaders, body: JSON.stringify({ targetId: TRACK_ID, type: 'song' }) }
      );
    } else {
      console.log('\n(Skipped write scenarios — pass --trackId, --csrfCookie, and --csrfToken.)');
    }
  } else {
    console.log('\n(Skipped authenticated/write scenarios — pass --token=<jwt>.)');
  }

  console.log('\n=== Summary (sorted by p99 latency, worst first) ===');
  summaries
    .sort((a, b) => b.p99 - a.p99)
    .forEach((s) => {
      console.log(
        `${s.p99.toString().padStart(6)}ms p99  ${s.rps.toFixed(0).padStart(5)} req/s  ${s.errors > 0 ? `⚠️ ${s.errors} errors  ` : ''}${s.label}`
      );
    });
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exitCode = 1;
});
