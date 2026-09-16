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

## Production deployment (Railway)

The backend runs on Railway as a single service (`musify`, project
`affectionate-appreciation`), building from the exact Dockerfile verified
in CI's `docker-build` job — not Railway's Nixpacks/Railpack
auto-detection. This is declared in `Backend/railway.json`
(`build.builder: "DOCKERFILE"`, `build.dockerfilePath: "Dockerfile"`);
Railway auto-discovers this file from the service's configured root
directory (`Backend`). **Do not delete or rename this file** — without it,
Railway falls back to Railpack's own language auto-detection, which picks
up `package.json` and builds a plain Node app instead of the Docker image
(this is exactly the failure mode that happened before `railway.json`
existed: the build technically succeeded but produced the wrong artifact
entirely, silently).

- **Live URL**: `https://musify-production-6f35.up.railway.app`
- **Triggers on**: every push to `main` (Railway watches the
  `Spyro007-06/musify` GitHub repo directly, root directory `Backend`).
  `main` has branch protection requiring `build-lint-test` and
  `Docker build & container health check` to pass — a PR can't merge
  without both green, though a repo admin can still push directly
  (`enforce_admins: false`), same as this project's established workflow.
- **Health check**: Railway polls `GET /api/health/ready`
  (`healthcheckTimeout: 300`s) after each deploy and won't cut traffic
  over to a new instance until it returns 200 — a build that succeeds but
  produces a container that crashes or can't reach the DB stays on the
  previous instance instead of going live.
- **Replicas**: pinned to `numReplicas: 1` deliberately — `DATABASE_URL`'s
  `connection_limit=10` (see Prerequisites above) assumes exactly one
  instance. Do not raise `numReplicas` without first revisiting that
  connection limit, or multiple instances can collectively exhaust the
  database's connection ceiling.
- **Environment variables**: set directly in Railway (`railway variable
  set KEY --stdin --service musify`, or the dashboard's Variables tab) —
  never committed to the repo. `.env.example` is the source of truth for
  which variables exist and what they mean; keep it in sync when adding a
  new one, including ones read outside `config/env.ts` (e.g.
  `RECOMMENDATION_CRON_SCHEDULE`, read directly via `process.env`).
- **Checking deploy health**: `railway status --service musify` (or the
  dashboard) shows current deploy state (`Building` / `Online` / `Failed`).
  `railway deployment list --service musify --json` lists deployment
  history with status, commit, and image digest.
- **Logs**: `railway logs --service musify` (build logs: add `--build`;
  runtime logs of the current deployment: add `--deployment`), or the
  Railway dashboard's Logs tab for the same data with search/filtering.
  This is the first place to look for a live incident — Sentry has the
  aggregated/alerted view, Railway logs have the raw stdout/stderr
  including anything printed before Sentry initialized.
- **If a deploy fails**: Railway keeps every previous successful
  deployment's build artifact. Roll back via the dashboard's Deployments
  tab — find the last `SUCCESS` entry before the bad one and hit
  "Redeploy" on it (this re-runs that exact prior image, not a fresh
  build). `railway deployment list --service musify --json` gives the
  deployment IDs and commit hashes needed to identify which one that is
  from the CLI. Same schema-migration caution as the generic Rollback
  section below applies.

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

## Monitoring checklist (not yet wired up — see production-readiness review)

- [ ] Alert on `/api/health/ready` returning non-200 for >N minutes
- [ ] Alert on Sentry issue volume spikes (once `SENTRY_DSN` is set)
- [ ] Dashboard for request rate / error rate / p50-p99 latency (no APM/metrics
      exporter wired up yet — logs are the only source of truth today)
- [ ] Track `Circuit breaker "jiosaavn"` open/close events as a signal of
      upstream health, not just app health
