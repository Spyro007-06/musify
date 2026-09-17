#!/usr/bin/env node
/**
 * Production auth smoke test — see Backend/RUNBOOK.md "Auth smoke test"
 * section for the full writeup of why this exists.
 *
 * Exercises the exact path that silently broke in production for an
 * unknown period before being caught by hand: real login against the real
 * Supabase project, then a real Bearer token against a protected endpoint.
 * Runs on a schedule (.github/workflows/auth-smoke-test.yml), not on every
 * PR — it needs live production credentials and shouldn't gate normal
 * development on live external state.
 *
 * Zero dependency on the main Backend app/build (no Prisma, no env.ts) —
 * this is a standalone script with its own package.json specifically so a
 * failure here can never be masked by, or coupled to, unrelated backend
 * build/install issues. Its only dependency is @sentry/node, reusing the
 * project's already-configured, already-verified-working Sentry project
 * instead of adding a new alerting channel.
 */
import * as Sentry from '@sentry/node';

const BACKEND_URL = (process.env.SMOKE_BACKEND_URL || 'https://musify-production-6f35.up.railway.app').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_TEST_EMAIL;
const PASSWORD = process.env.SMOKE_TEST_PASSWORD;
const EXPECTED_USERNAME = process.env.SMOKE_TEST_USERNAME || 'musify_uptime_monitor';
const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production-smoke-test',
    tracesSampleRate: 0,
  });
}

/** Merges Set-Cookie headers from a response into a simple cookie jar (name -> value). */
function mergeCookies(jar, response) {
  const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  for (const raw of setCookies) {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

class SmokeTestFailure extends Error {
  constructor(step, message, context) {
    super(`[${step}] ${message}`);
    this.name = 'SmokeTestFailure';
    this.step = step;
    this.context = context;
  }
}

async function fail(step, message, context = {}) {
  const error = new SmokeTestFailure(step, message, context);
  console.error(`\n🔴 PRODUCTION AUTH SMOKE TEST FAILED at step "${step}"`);
  console.error(message);
  if (Object.keys(context).length > 0) {
    console.error('Context:', JSON.stringify(context, null, 2));
  }

  if (SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: { smoke_test: 'auth', step },
      extra: { backend_url: BACKEND_URL, ...context },
      level: 'fatal',
    });
    await Sentry.flush(5000);
    console.error('Reported to Sentry.');
  } else {
    console.error(
      'SENTRY_DSN not set for this workflow — no Sentry alert sent. This run failing red in GitHub Actions is the only signal right now. See RUNBOOK.md to wire up the SENTRY_DSN secret.'
    );
  }

  process.exit(1);
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    await fail('config', 'SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD are not set.');
    return;
  }

  const jar = {};

  // 1. CSRF token (required for the login mutation).
  const csrfRes = await fetch(`${BACKEND_URL}/api/auth/csrf`);
  mergeCookies(jar, csrfRes);
  if (!csrfRes.ok) {
    await fail('csrf', `GET /auth/csrf returned ${csrfRes.status}`, { status: csrfRes.status });
    return;
  }
  const csrfBody = await csrfRes.json();
  const csrfToken = csrfBody?.csrfToken;
  if (!csrfToken) {
    await fail('csrf', 'No csrfToken in /auth/csrf response.', { body: csrfBody });
    return;
  }

  // 2. Real login against the real Supabase project — the exact path that
  //    was broken (ES256 tokens rejected by HS256 verification) and went
  //    undetected before this check existed.
  const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      Cookie: cookieHeader(jar),
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  mergeCookies(jar, loginRes);
  const loginBody = await loginRes.json().catch(() => null);
  if (!loginRes.ok) {
    await fail('login', `POST /auth/login returned ${loginRes.status} (expected 200).`, {
      status: loginRes.status,
      body: loginBody,
    });
    return;
  }
  const accessToken = loginBody?.data?.accessToken;
  if (!accessToken) {
    await fail('login', 'Login succeeded (200) but no accessToken in response.', { body: loginBody });
    return;
  }

  // 3. The endpoint that was silently broken: a protected GET with the
  //    fresh Bearer token. This is the core assertion of the whole check.
  const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meBody = await meRes.json().catch(() => null);
  if (!meRes.ok) {
    await fail('auth-me', `GET /auth/me returned ${meRes.status} (expected 200) — this is exactly the failure mode of the outage this check exists to catch.`, {
      status: meRes.status,
      body: meBody,
    });
    return;
  }
  if (meBody?.data?.username !== EXPECTED_USERNAME) {
    await fail('auth-me', 'GET /auth/me returned 200 but with an unexpected username — token may be resolving to the wrong account.', {
      expected: EXPECTED_USERNAME,
      actual: meBody?.data?.username,
    });
    return;
  }

  // 4. One more representative authenticated read, kept narrow — this is
  //    a smoke test, not a regression suite.
  const likedRes = await fetch(`${BACKEND_URL}/api/music/liked`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!likedRes.ok) {
    const likedBody = await likedRes.json().catch(() => null);
    await fail('music-liked', `GET /music/liked returned ${likedRes.status} (expected 200).`, {
      status: likedRes.status,
      body: likedBody,
    });
    return;
  }

  console.log('🟢 Production auth smoke test passed: login, /auth/me, and /music/liked all succeeded.');
  process.exit(0);
}

main().catch(async (err) => {
  await fail('unexpected', err instanceof Error ? err.message : String(err), {
    stack: err instanceof Error ? err.stack : undefined,
  });
});
