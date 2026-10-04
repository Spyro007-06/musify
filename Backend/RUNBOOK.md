# Deployment runbook

Operational reference for running this backend in production: deploying,
rolling back, secrets, and troubleshooting the failure modes that are
actually likely to happen.

## Prerequisites

- A reachable Postgres database (Supabase-hosted or otherwise), with
  `DATABASE_URL` pointed at it. `DATABASE_URL` carries an explicit
  `connection_limit=10`, sized for **one** app instance against this
  project's current tier (`max_connections=60`). Before running multiple
  instances or scaling up, review and likely lower this per instance —
  N instances each holding 10 connections will exhaust the database well
  before N gets very large. See `.env.example` for the full reasoning.
- A Supabase Auth project (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`) — auth is delegated to Supabase, this
  service never stores passwords itself. Bearer tokens are verified via
  `supabase.auth.getClaims()` against the project's JWKS
  (`/.well-known/jwks.json`), not a shared secret — no
  `SUPABASE_JWT_SECRET` is needed or read.
- `GEMINI_API_KEY` (optional, but required for "Import from screenshots",
  `POST /api/playlists/import/screenshot`) — without it, that endpoint
  returns a clean 503 saying so; there is no mock fallback. See
  `.env.example` for where to get a key.
- See `.env.example` for the full list; `src/config/env.ts` validates all of
  it at boot and refuses to start with anything missing/malformed.

## Secrets management

Today, config comes from a `.env` file (gitignored, never committed) or
whatever env vars the deploy target injects. Before this handles real user
data at scale, move `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and
`CSRF_SECRET` into a real secrets manager (AWS Secrets Manager / SSM
Parameter Store, GCP Secret Manager, HashiCorp Vault, or your platform's
equivalent) rather than plain env vars on the host — `env.ts` doesn't care
where the values come from, so this is purely a deploy-pipeline change,
not a code change. At minimum:
- Rotate `CSRF_SECRET` if it was ever committed, logged, or shared outside
  the team.
- Never put secrets in a Dockerfile `ENV`/`ARG` — inject at container
  runtime (`docker run -e`, your orchestrator's secret mount, etc.).

## Deploying

1. **Build the image**: `docker build -t musify-backend:<tag> .` (from
   `Backend/`). The image runs `npm prune --omit=dev` internally, so the
   final image doesn't carry devDependencies or source maps of tooling —
   only `dist/`, production `node_modules`, and `prisma/`.
2. **Run migrations before starting new instances**:
   `npx prisma migrate deploy` (against `DATABASE_URL`) as a separate
   step/job — not inside the app's own startup path, so a bad migration
   doesn't take down already-running instances mid-deploy.
   - `20261002120000_playlist_order_drop_session_history` adds
     `PlaylistTrack.position` (backfilled from add order) and drops the
     never-used `SessionHistory` table plus `ListeningHistory.sessionId`.
     Run it right before deploying that release: until the new code is
     live, the old code's listening-history reads/writes fail (they still
     select `sessionId`); everything else keeps working. Playlist reads in
     the new code need `position`, so don't deploy it before migrating.
   - The `spotifyTrackId`/`spotifyArtistId` columns keep their names in the
     database; the code calls them `trackId`/`artistId` via `@map`.
   - If `SAAVN_PROXY_URL` is set, `SAAVN_PROXY_KEY` must be set to the same
     value on the backend and the frontend (Vercel) before deploying: the
     production relay now rejects keyless requests, and the backend refuses
     to boot with a relay URL but no key.
3. **Start the container**, pointing health checks at:
   - Liveness: `GET /api/health/live` — restart the container if this fails.
   - Readiness: `GET /api/health/ready` — stop routing traffic here if this
     fails (it means the DB isn't reachable), but don't necessarily restart.
4. **Verify**: hit `/api/health/ready` on the new instance directly before
   cutting traffic over. Confirm `/api/docs` (Swagger) reflects the
   expected version if `SWAGGER_ENABLED=true`.

CI (`.github/workflows/backend-ci.yml`) runs `prisma generate → lint →
build → test → audit` on every push/PR — a red run there means don't
deploy, full stop.

## Production deployment (Render)

The backend runs on Render as a single free web service (`musify-api`,
region Singapore, next to the Supabase database), building
`Backend/Dockerfile` — the same image CI's `docker-build` job verifies.
It was moved off Railway on 2026-09-28; there is no background worker.

- **Live URL**: `https://musify-api-m2dw.onrender.com`. The frontend never
  calls it directly: Vercel proxies `/api/*` to it via
  `NEXT_PUBLIC_BACKEND_URL` (see `frontend/next.config.ts`), which keeps
  the auth/CSRF cookies first-party. Leave `NEXT_PUBLIC_API_URL` unset on
  Vercel — pointing the browser straight at Render breaks those cookies
  and CORS.
- **Triggers on**: every push to `main` that changes `Backend/**`, once
  Backend CI passes. `.github/workflows/deploy-render.yml` then calls the
  service's Deploy Hook (repo secret `RENDER_DEPLOY_HOOK_URL`) for that
  exact commit. Render's own GitHub auto-deploy never fired for this repo,
  so the service's Auto-Deploy is set to Off. Dockerfile
  `./Backend/Dockerfile`, context `./Backend`. If a push doesn't deploy,
  check the "Deploy backend to Render" run in the Actions tab, then deploy
  manually from the dashboard (Manual Deploy → Deploy latest commit).
- **Free plan sleeps** after 15 idle minutes, and requests through the
  Vercel proxy 502 until it wakes (~20-50s). The auth smoke test runs every
  10 minutes partly to keep it awake. The daily recommendation cron runs
  in-process, so it only fires while the instance is awake.
- **No background worker**: `REDIS_URL` is set to an empty value, which
  turns the BullMQ queue off (`src/config/queue.ts`); `/api/health/ready`
  reports `queue: "disabled"`. To bring jobs back, add a paid Render
  background worker running `node dist/jobs/workerMain.js` and set
  `REDIS_URL` on both services.
- **Health check**: `GET /api/health/ready` (set under the service's
  Settings → Health Check Path). Returns 503 only when the database is
  unreachable.
- **Single instance**: `DATABASE_URL`'s `connection_limit=10` assumes one
  instance. Revisit that limit before scaling out.
- **Environment variables**: set in the Render dashboard (service →
  Environment) — never committed to the repo. `.env.example` is the source
  of truth for which variables exist; keep it in sync when adding one,
  including ones read outside `config/env.ts` (e.g.
  `RECOMMENDATION_CRON_SCHEDULE`). `DIRECT_URL` is only needed where
  `prisma migrate` runs, not on Render.
- **Deploy state, logs, rollback**: the Render dashboard's Events tab
  lists deploys (with commit) and their status; the Logs tab has build and
  runtime logs — the first place to look in an incident, before Sentry
  initialized output included. To roll back, open a previous successful
  deploy in Events and choose "Rollback". Same schema-migration caution as
  the generic Rollback section below applies.

## Rollback

1. Roll the container/service back to the previous image tag — this repo
   doesn't yet have blue/green or canary tooling, so "rollback" today means
   "redeploy the last known-good image."
2. If the bad deploy included a migration: **don't automatically run the
   old migration set against the new (already-migrated) schema.** Check
   whether the migration was additive (safe to leave in place while rolling
   back app code) or destructive (needs a hand-written down-migration).
   `prisma/migrations/` has no down-migrations generated automatically —
   write one manually before rolling back a destructive schema change.
3. Confirm `/api/health/ready` is green on the rolled-back instance before
   declaring the rollback complete.

## Recommendation engine operations

The recommendation model recomputes on a cron (`RECOMMENDATION_CRON_SCHEDULE`,
default every 6h — see `RECOMMENDATIONS.md`). Operationally:
- It runs **inside the same process** serving HTTP traffic today — this is
  a known scaling limit (flagged with a `ponytail:` comment in
  `engine.ts`). If recompute latency starts showing up in request p99s,
  move it to a separate worker process/service before scaling further.
- Runnable on demand: `npm run recommendations:compute` (e.g. right after a
  deploy that changes scoring logic, so users don't wait for the next
  scheduled tick).
- Sanity-check model quality after a scoring-logic change:
  `npm run recommendations:evaluate`.
- Each recompute run also cleans up `RecommendationScores` for churned
  users and expired `RecommendationCache` rows — see the cron/script log
  line for counts; a suspiciously large "stale scores cleaned" number on
  every run points at recompute silently failing to pick up active users
  (check the candidate-pool / rating-matrix build step first).

## Load testing before trusting defaults at scale

`npm run loadtest -- --url=<target> --token=<a real JWT>` (see
`src/scripts/loadTest.ts`) hits health, trending, search, and — with a
token — the recommendation dashboard. **Never point this at production.**
Run it against a staging/pre-prod copy before assuming
`CANDIDATE_POOL_SIZE`/`TOP_N_PER_USER` (in `engine.ts`) or the rate-limit
defaults (`RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`) hold up at your real
traffic level.

## Troubleshooting common failure modes

| Symptom | Likely cause | Where to look |
|---|---|---|
| `/api/health/ready` returns 503 | DB unreachable | Check `DATABASE_URL`, Postgres/PgBouncer status, connection pool exhaustion |
| Requests to music/search/artist routes all slow or empty | JioSaavn upstream down or slow | Logs: `Circuit breaker "jiosaavn" opened` — the app is failing fast on purpose; wait for `half-open`/`closed` log lines, or check JioSaavn's status directly |
| A specific request 500s with no obvious cause | Uncaught error in a controller/service | Grep logs for the `requestId` from the response body's `requestId` field — every log line for that request carries it (see `requestContext.ts`) |
| POST/PUT/DELETE returns 403 "Invalid or missing CSRF token" | Client didn't fetch `/api/auth/csrf` first, or cookie/header mismatch | Confirm the client is doing the double-submit dance: GET `/api/auth/csrf` → send the returned token back as `x-csrf-token` on the next request |
| Signup/login suddenly all failing | Supabase Auth outage, `SUPABASE_*` secrets rotated without updating this service, or a JWT-verification regression (see the 2026-09-16 incident) | The "Auth smoke test" workflow (below) should catch this within ~15 minutes and alert via Sentry; check Supabase status page; verify env vars match the current Supabase project |
| 429 responses under normal-looking load | Rate limit defaults too low for real traffic | Tune `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`/`AUTH_RATE_LIMIT_MAX` — load-test first |
| Errors not showing up anywhere but logs | `SENTRY_DSN` unset | Set it if you want alerting beyond log-scraping — see `.env.example` |
| `POST /api/playlists/import/screenshot` returns 503 | `GEMINI_API_KEY` unset | Set it on the Render service; free key at https://aistudio.google.com/apikey |
| `POST /api/playlists/import/screenshot` returns 502 | Gemini rejected the call (bad key, quota) or replied with unreadable JSON | Check the `Screenshot import: Gemini returned …` warn log for the status and message |

## Error tracking (Sentry)

**Getting a DSN for a new environment**: sign in at https://sentry.io →
create (or reuse) a project → Settings → Projects → `<project>` → Client
Keys (DSN) → copy the DSN URL. Use a separate DSN per environment
(dev/staging/prod) if you want them to appear as separate Sentry projects
rather than mixed together; otherwise set `environment` filtering in
Sentry's UI and share one DSN.

**Setting it**: put the DSN in `SENTRY_DSN` wherever that environment's
other secrets live (see "Secrets management" above) — same mechanism as
`DATABASE_URL`/`SUPABASE_*`, nothing Sentry-specific to wire up beyond the
env var.

**What "no DSN set" means operationally**: the app runs completely
normally either way — `initSentry()` (`src/config/sentry.ts`) checks
`SENTRY_DSN` once at startup and no-ops everything Sentry-related if it's
unset. Concretely, with no DSN:
- Every uncaught exception, unhandled promise rejection, and
  `errorHandler`-caught error is still logged (see `src/utils/logger.ts`'s
  daily-rotating files), but **only** there — nothing is aggregated,
  deduplicated, alerted on, or searchable across requests.
- There is no dashboard, no issue grouping, no "this error started
  spiking 10 minutes ago" signal — someone has to already know to go
  grep the log files to find out anything went wrong.
- The server logs a `⚠️ Booting in production without SENTRY_DSN set`
  warning on startup when `NODE_ENV=production` and no DSN is present, so
  this silent-local-log-only mode can't regress unnoticed again.

Local development is fine to run with no DSN — this section exists so a
new production-like environment doesn't inherit that mode by accident.

## Auth smoke test (recurring production login check)

**Why this exists**: on 2026-09-16, every real login on the live deployment
was silently rejected with 401 for an unknown period. Root cause: the live
Supabase project signs access tokens asymmetrically (ES256, via its JWKS
endpoint), but `authenticate`/`optionalAuthenticate`
(`src/middlewares/auth.ts`) verified with `jwt.verify(token,
SUPABASE_JWT_SECRET)` — a symmetric-secret check that can never validate an
asymmetrically-signed token. This was never caught because:
- CI's `docker-build` job (`.github/workflows/backend-ci.yml`) starts the
  built container with **placeholder** Supabase credentials
  (`SUPABASE_URL="https://placeholder.supabase.co"`, etc.) and only asserts
  `GET /api/health/ready` — unauthenticated — returns 200. It cannot catch
  this class of bug by construction: it never talks to the real Supabase
  project and never calls a protected endpoint.
- The Jest suite mocks Supabase entirely (`src/tests/setup/supabaseMock.ts`)
  — `jwt.verify(..., SUPABASE_JWT_SECRET)`, the actually-broken line, was
  never executed by any test.
- Nothing exercised a real login → protected-endpoint round trip against
  live production on any recurring basis. See the fix commit and the
  session that found/fixed it for the full incident writeup.

**What it does**: `.github/workflows/auth-smoke-test.yml` runs
`Backend/scripts/smoke-test/authSmokeTest.mjs` on a schedule against the
real live backend (not localhost, not a CI-spun container):
1. Fetches a real CSRF token.
2. Logs in for real, with a dedicated synthetic account (see below) against
   the real production Supabase project — the exact path that broke.
3. Calls `GET /auth/me` with the resulting token and checks for `200` +
   the expected username — this is the specific check that would have
   caught the outage immediately.
4. Calls `GET /music/liked` as one more representative authenticated read
   (narrow on purpose — this is a smoke test, not a regression suite).
5. On any failure, reports to Sentry (if `SENTRY_DSN` is set for the
   workflow — see below) and exits non-zero, which shows as a failed run
   in the Actions tab regardless.

The script is a standalone package (its own `package.json`, only
dependency `@sentry/node`) deliberately **not** part of the main Backend
install/build — a failure here must never be masked by, or coupled to, an
unrelated backend build/install problem.

**Mechanism — why scheduled, not per-deploy or per-PR**:
- **Not on every PR/push**: it needs live production credentials and real
  external state; gating normal development on that would make CI flaky
  for reasons unrelated to the code being reviewed.
- **Schedule, every 10 minutes** (`cron: '*/10 * * * *'`; it also keeps
  Render's free instance from sleeping), rather than a
  post-deploy webhook triggering `workflow_dispatch`: a working
  webhook integration is real infrastructure to build and maintain
  (host-side webhook config, a GitHub token with `workflow_dispatch`
  permission stored as a host secret, and handling for webhook
  delivery failures). A 15-minute recurring check catches the same class
  of outage within, worst case, 15 minutes of a bad deploy — acceptable
  detection latency for a smoke test on a project this size, for
  meaningfully less to build and keep working. GitHub's own scheduling has
  some inherent jitter under load, so treat 15 minutes as "usually well
  under 20," not a hard guarantee. Revisit if faster detection ever
  actually matters (add the webhook then, don't build it speculatively
  now).

**Alerting — Sentry, not a new channel**: on failure, the script calls
`Sentry.captureException` (tagged `smoke_test: auth`, `level: fatal`) using
this project's existing, already-verified-working Sentry setup, rather
than adding email/Slack/a new webhook. GitHub Actions' own run-failure
indicator (red X in the Actions tab, and whatever notification settings
the repo owner already has for failed scheduled runs) is a free secondary
signal on top, not a replacement — the workflow always exits non-zero on
failure regardless of whether Sentry is configured. **Action needed**: add
a `SENTRY_DSN` repository secret (see "Getting a DSN" below) — this wasn't
set as part of building the check because the value lived only in the
old Railway service's env vars (the Sentry project's settings have it
too), not anywhere this session could read it. Until it's
set, failures are still visible (workflow goes red) but don't generate a
Sentry alert; the script logs this explicitly when it happens.

**The synthetic monitoring account — permanent, not throwaway**:
- Username `musify_uptime_monitor`, email
  `musify.synthetic.monitor@example.com`.
- **This is an intentional, permanent fixture, not leftover test data.** A
  future cleanup pass should not delete it the way ad-hoc verification
  sessions clean up their own throwaway accounts — check the username
  before deleting any `User` row that looks like test data.
- Its password is stored **only** as the `SMOKE_TEST_PASSWORD` GitHub
  Actions repository secret (alongside `SMOKE_TEST_EMAIL`) — never in any
  tracked file, never logged.
- **Rotating it**: log in as this account (or use `supabaseAdmin` directly)
  to change its password, then update the `SMOKE_TEST_PASSWORD` secret
  (`gh secret set SMOKE_TEST_PASSWORD --repo Spyro007-06/musify`) to match.
  Rotate if it's ever exposed in a log or screen share.
- **Data footprint**: the check only ever performs read-only calls (`GET
  /auth/me`, `GET /music/liked`) — it never likes, follows, or plays
  anything, so there's currently nothing from this account to exclude from
  recommendation-training data. If this check is ever extended to exercise
  a write path (e.g. a like/unlike round trip), that decision should come
  with an explicit exclusion of this account's activity from any
  analytics/recommendation training — flagging this now so it isn't missed
  later, not because it's a problem today.

**If it fires**: treat exactly like the original incident until proven
otherwise — check `/auth/me` manually against production first (same curl
recipe as the incident: fetch `/auth/csrf`, log in, call `/auth/me` with
the token), check Supabase's status page, check whether Supabase's signing
keys were rotated (`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
should return the key matching a real token's `kid`), and check recent
deploys (Render dashboard → Events) for anything
touching `src/middlewares/auth.ts`, `src/config/supabase.ts`, or
`SUPABASE_*` env vars.

**Proven, not just assumed to work**: before shipping, the script was run
against real production three times — once with a deliberately wrong
password (fails cleanly at the `login` step), once with a deliberately
corrupted valid token (fails cleanly at the `auth-me` step — this
reproduces the exact historical bug shape: login succeeds, protected
endpoint rejects the token), and once for real (passes cleanly). The
token-corruption test was a temporary edit to the script, reverted
immediately after confirming the failure — never shipped.

## Monitoring checklist (not yet wired up — see production-readiness review)

- [x] Recurring check that a real login + protected endpoint actually work
      (see "Auth smoke test" above) — the one gap this session found and
      closed after the 2026-09-16 outage.
- [ ] Alert on `/api/health/ready` returning non-200 for >N minutes
- [ ] Alert on Sentry issue volume spikes (once `SENTRY_DSN` is set —
      including for the auth smoke test workflow specifically, see above)
- [ ] Dashboard for request rate / error rate / p50-p99 latency (no APM/metrics
      exporter wired up yet — logs are the only source of truth today)
- [ ] Track `Circuit breaker "jiosaavn"` open/close events as a signal of
      upstream health, not just app health
