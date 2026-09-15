/**
 * Load-test scaffold for the endpoints most likely to fall over first: the
 * recommendation dashboard (reads a precomputed model + does live diversity
 * filtering) and a cold-start-free public browse path.
 *
 * This does NOT run anywhere automatically — it's a tool for someone to
 * point at a real running instance (local, staging, or a pre-prod copy)
 * before trusting the defaults in RECOMMENDATIONS.md at real traffic
 * levels. Never point this at production.
 *
 * Usage:
 *   npm run loadtest -- --url=http://localhost:3001 --duration=30 --connections=20
 *   npm run loadtest -- --url=http://localhost:3001 --token=<a real JWT> --duration=30
 *
 * Without --token, only unauthenticated endpoints are exercised (trending,
 * new releases, search) — the recommendation dashboard needs a real
 * logged-in user's token to test the code path that actually matters.
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

function printResult(label: string, result: Result): void {
  console.log(`\n--- ${label} ---`);
  console.log(`Requests/sec: ${result.requests.average.toFixed(1)} (min ${result.requests.min}, max ${result.requests.max})`);
  console.log(`Latency (ms): p50=${result.latency.p50} p90=${result.latency.p90} p99=${result.latency.p99} max=${result.latency.max}`);
  console.log(`2xx: ${result['2xx']}  Non-2xx/errors: ${result.non2xx + result.errors}`);
  if (result.non2xx + result.errors > 0) {
    console.warn(`⚠️  ${result.non2xx + result.errors} non-2xx/error responses — check server logs for that window.`);
  }
}

async function runScenario(label: string, path: string, headers: Record<string, string> = {}): Promise<void> {
  const result = await autocannon({
    url: `${BASE_URL}${path}`,
    duration: DURATION_SECONDS,
    connections: CONNECTIONS,
    headers,
  });
  printResult(label, result);
}

async function main() {
  console.log(`Load testing ${BASE_URL} — ${CONNECTIONS} connections for ${DURATION_SECONDS}s per scenario.`);

  await runScenario('Health (readiness)', '/api/health/ready');
  await runScenario('Trending tracks (public, uncached external call)', '/api/music/trending');
  await runScenario('Search', '/api/search?q=love');

  if (TOKEN) {
    const authHeaders = { authorization: `Bearer ${TOKEN}` };
    await runScenario('Recommendation dashboard (authenticated, the hot path)', '/api/recommendations', authHeaders);
    await runScenario('Recommended songs', '/api/recommendations/songs', authHeaders);
  } else {
    console.log('\n(Skipped authenticated recommendation endpoints — pass --token=<jwt> to include them.)');
  }
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exitCode = 1;
});
