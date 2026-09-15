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
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`) — auth is delegated to
  Supabase, this service never stores passwords itself.
- See `.env.example` for the full list; `src/config/env.ts` validates all of
  it at boot and refuses to start with anything missing/malformed.

## Secrets management

Today, config comes from a `.env` file (gitignored, never committed) or
whatever env vars the deploy target injects. Before this handles real user
data at scale, move `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
`DATABASE_URL`, and `CSRF_SECRET` into a real secrets manager (AWS
Secrets Manager / SSM Parameter Store, GCP Secret Manager, HashiCorp Vault,
or your platform's equivalent) rather than plain env vars on the host —
`env.ts` doesn't care where the values come from, so this is purely a
deploy-pipeline change, not a code change. At minimum:
- Rotate `SUPABASE_JWT_SECRET` and `CSRF_SECRET` if they were ever
  committed, logged, or shared outside the team.
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
| Signup/login suddenly all failing | Supabase Auth outage, or `SUPABASE_*` secrets rotated without updating this service | Check Supabase status page; verify env vars match the current Supabase project |
| 429 responses under normal-looking load | Rate limit defaults too low for real traffic | Tune `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`/`AUTH_RATE_LIMIT_MAX` — load-test first |
| Errors not showing up anywhere but logs | `SENTRY_DSN` unset | Set it if you want alerting beyond log-scraping — see `.env.example` |

## Monitoring checklist (not yet wired up — see production-readiness review)

- [ ] Alert on `/api/health/ready` returning non-200 for >N minutes
- [ ] Alert on Sentry issue volume spikes (once `SENTRY_DSN` is set)
- [ ] Dashboard for request rate / error rate / p50-p99 latency (no APM/metrics
      exporter wired up yet — logs are the only source of truth today)
- [ ] Track `Circuit breaker "jiosaavn"` open/close events as a signal of
      upstream health, not just app health
