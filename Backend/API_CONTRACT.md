# Musify Backend — API Contract

Generated from the current route/controller/validator source (not hand-maintained separately — if this drifts from `src/routes/*.routes.ts`, the source wins). Interactive Swagger UI is also available at `/api/docs` when `SWAGGER_ENABLED=true`, but its route-annotation coverage is partial (see note at the bottom); this document covers every route.

## Conventions

**Base URL**: `{APP_URL}{API_PREFIX}` — by default `http://localhost:3001/api`.

**Response envelope** — every endpoint returns one of these two shapes:

```jsonc
// success
{ "success": true, "message": "...", "data": { ... }, "meta": { ... } } // data/meta omitted if not applicable

// error
{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }], "requestId": "..." }
```

Paginated list endpoints add `meta: { page, limit, total, totalPages, hasNextPage, hasPrevPage }`.

**Auth**: `Authorization: Bearer <supabase-jwt>`. Three levels per route, noted per-endpoint below:
- **none** — no auth accepted/required.
- **optional** — works unauthenticated; an authenticated request gets personalized data (e.g. `isLiked`, `isFollowing`) layered on top.
- **required** — 401 without a valid token.

**CSRF**: every mutating request (`POST`/`PUT`/`PATCH`/`DELETE`) requires an `x-csrf-token` header, obtained first via `GET /api/auth/csrf` (returns `{ csrfToken }`; also sets the paired `x-csrf-token` cookie the double-submit check compares against). `GET`/`HEAD`/`OPTIONS` are exempt.

**Rate limiting**: global default `100` requests / `15 min` per client (`RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`); `/api/auth/signup` and `/api/auth/login` are additionally capped at `10` / `15 min` (`AUTH_RATE_LIMIT_MAX`). Exceeding either returns `429`.

**Common object shapes** (fields as actually mapped from the JioSaavn catalog — `src/services/saavn.service.ts`):

```ts
Track {
  id: string; title: string; duration: number; artwork: string | null; audioUrl: string | null;
  artists: { id: string; name: string }[];
  album?: { id: string; title: string; artwork: string | null; releaseYear?: number; type: string };
  playCount: number; genre?: string; // "genre" is actually the catalog's language field (hindi/tamil/english/...)
  isLiked?: boolean; // present wherever populateLikes runs — optional-auth or authenticated requests
}
Album {
  id: string; title: string; artist: { id: string; name: string }; artwork: string | null;
  releaseYear?: number; tracksCount: number; type: string; genre?: string; tracks: Track[];
}
Artist {
  id: string; name: string; image: string | null; followers: number; isVerified: boolean;
  genres: string[]; bio: string; isFollowing?: boolean; // isFollowing present on GET /artists/:id
}
Playlist (catalog-sourced, e.g. mood results) {
  id: string; title: string; description: string; cover: string | null; tracksCount: number;
  owner: string; isPublic: boolean;
}
```

---

## Auth — `/api/auth`

| Method | Path | Auth | Rate limit |
|---|---|---|---|
| POST | `/auth/signup` | none | auth (10/15min) |
| POST | `/auth/login` | none | auth (10/15min) |
| POST | `/auth/logout` | optional | global |
| POST | `/auth/refresh` | none | global |
| GET | `/auth/me` | required | global |
| GET | `/auth/csrf` | none | global |

- **POST /auth/signup** — body: `{ email: string, username: string, password: string, displayName?: string, role?: 'USER'|'ARTIST' }` → `201`, `data`: created user profile + session tokens.
- **POST /auth/login** — body: `{ email? or username?: string, password: string }` (one of email/username required) → `200`, `data`: user profile + session tokens.
- **POST /auth/logout** — body: `{ refreshToken?: string }` → `200`.
- **POST /auth/refresh** — body: `{ refreshToken: string }` → `200`, `data`: new session tokens.
- **GET /auth/me** — → `200`, `data`: current user profile.
- **GET /auth/csrf** — → `200`, `{ csrfToken: string }` (not wrapped in the standard envelope).

---

## Music — `/api/music`

| Method | Path | Auth |
|---|---|---|
| GET | `/music/trending` | optional |
| GET | `/music/new-releases` | none |
| GET | `/music/recommended` | optional |
| GET | `/music/tracks/:id` | optional |
| GET | `/music/albums/:id` | optional |
| GET | `/music/albums` | none |
| POST | `/music/tracks/:trackId/like` | required |
| DELETE | `/music/tracks/:trackId/like` | required |
| GET | `/music/liked` | required |
| GET | `/music/recently-played` | required |
| GET | `/music/categories` | none |
| GET | `/music/mood/:mood` | none |
| GET | `/music/tracks/:trackId/stream` | optional |
| GET | `/music/recommendations` | optional |

- **GET /music/trending** → `200`, `data: Track[]`.
- **GET /music/new-releases** → `200`, `data: Album[]`.
- **GET /music/recommended** → `200`, `data: Track[]` — for an authenticated user, derived from their own likes/history/follows; anonymous gets generic picks.
- **GET /music/tracks/:id** → `200`, `data: Track`; `404` if unknown.
- **GET /music/albums/:id** → `200`, `data: Album`; `404` if unknown.
- **GET /music/albums** — query: `page?: number` (default 1) → `200`, `data: Album[]`, paginated `meta`.
- **POST /music/tracks/:trackId/like** → `200`; idempotent (already-liked → no-op, still `200`).
- **DELETE /music/tracks/:trackId/like** → `200`; idempotent (not-liked → no-op `200`, not `404`).
- **GET /music/liked** — query: `page?, limit?` → `200`, `data: Track[]` (all `isLiked: true`).
- **GET /music/recently-played** — query: `page?, limit?` → `200`, `data: Track[]`, newest-first.
- **GET /music/categories** → `200`, `data: { id, name, cover, gradient }[]` — fixed list of language categories (hindi/punjabi/tamil/english).
- **GET /music/mood/:mood** — `mood` is a freeform string, not a fixed enum (passed straight through to a catalog playlist search) → `200`, `data: Playlist[]`.
- **GET /music/tracks/:trackId/stream** → `200`, `data: { url: string }`; logs a play in listening history if authenticated. `404` unknown track, `503` if the upstream stream source itself is down.
- **GET /music/recommendations** — query: `languages?: string (comma-separated), limit?: number` → `200`, `data: Track[]`.

---

## Artists — `/api/artists`

| Method | Path | Auth |
|---|---|---|
| GET | `/artists/recommendations` | none |
| GET | `/artists/:id` | optional |
| GET | `/artists/:id/top-tracks` | optional |
| GET | `/artists/:id/albums` | none |
| GET | `/artists/:id/related` | none |
| POST | `/artists/:id/follow` | required |
| DELETE | `/artists/:id/follow` | required |

- **GET /artists/recommendations** — query: `artists?: string (comma-separated preferred artist names)` → `200`, `data: Artist[]` (falls back to a default popular-artist list if unresolvable).
- **GET /artists/:id** → `200`, `data: Artist` (`isFollowing` populated only when authenticated); `404` unknown.
- **GET /artists/:id/top-tracks** → `200`, `data: Track[]`.
- **GET /artists/:id/albums** → `200`, `data: Album[]`.
- **GET /artists/:id/related** → `200`, `data: Artist[]` (excludes the seed artist itself).
- **POST /artists/:id/follow** → `200`; idempotent (already-following → no-op). `404` if `id` isn't a real artist.
- **DELETE /artists/:id/follow** → `200`; idempotent (not-following → no-op `200`, not `404`).

---

## Playlists — `/api/playlists`

| Method | Path | Auth |
|---|---|---|
| GET | `/playlists` | required |
| POST | `/playlists` | required |
| GET | `/playlists/:id` | optional |
| DELETE | `/playlists/:id` | required |
| POST | `/playlists/:playlistId/tracks` | required |
| DELETE | `/playlists/:playlistId/tracks/:trackId` | required |

- **GET /playlists** → `200`, `data`: the caller's playlists.
- **POST /playlists** — body: `{ title: string, description?: string, coverUrl?: string, isPublic?: boolean }` → `201`, `data`: created playlist.
- **GET /playlists/:id** → `200`, `data`: playlist + tracks (private playlists only visible to their owner). `404` unknown/inaccessible.
- **DELETE /playlists/:id** → `200`; owner-only.
- **POST /playlists/:playlistId/tracks** — body: `{ trackId: string }` → `200`.
- **DELETE /playlists/:playlistId/tracks/:trackId** → `200`.

---

## Search — `/api/search`

| Method | Path | Auth |
|---|---|---|
| GET | `/search` | optional |
| GET | `/search/suggestions` | none |

- **GET /search** — query: `q: string` (required) → `200`, `data: { tracks: Track[], albums: Album[], artists: Artist[], playlists: Playlist[] }`.
- **GET /search/suggestions** — query: `q: string` (required) → `200`, `data: string[]` (title suggestions).

---

## Recommendations — `/api/recommendations`

All routes take the identity from the JWT; none accept a `userId` param.

| Method | Path | Auth |
|---|---|---|
| GET | `/recommendations` | optional |
| GET | `/recommendations/songs` | required |
| GET | `/recommendations/albums` | required |
| GET | `/recommendations/artists` | required |
| GET | `/recommendations/discover` | required |
| POST | `/recommendations/feedback` | required |
| POST | `/recommendations/smart-queue` | required |

- **GET /recommendations** → `200`, `data`: dashboard sections (`{ id, title, subtitle, type, items }[]` — time-of-day, recently-played, because-you-like, continue-listening, hidden-gems, trending-near-you, new-releases, discover-weekly), TTL-cached per user.
- **GET /recommendations/songs** — query: `limit?: number` (default 50) → `200`, `data: Track[]`.
- **GET /recommendations/albums** — query: `limit?: number` (default 10) → `200`, `data: Album[]`.
- **GET /recommendations/artists** — query: `limit?: number` (default 10) → `200`, `data: Artist[]`.
- **GET /recommendations/discover** → `200`, `data: Track[]` — excludes already-played tracks, capped at 30.
- **POST /recommendations/feedback** — body: `{ trackId: string, action: 'complete'|'skip'|'replay', duration?: number, skipTime?: number }` → `200`.
- **POST /recommendations/smart-queue** — body: `{ trackId: string, artistName: string, genre?: string, mood?: string }` → `200`, `data: Track[]` (max 20, diversified by artist).

---

## User — `/api/user`

| Method | Path | Auth |
|---|---|---|
| GET | `/user/profile` | required |
| PUT | `/user/profile` | required |
| POST | `/user/preferences` | required |
| GET | `/user/preferences` | required |
| POST | `/user/history` | required |
| POST | `/user/likes` | required |
| POST | `/user/dislikes` | required |
| POST | `/user/skip` | required |

- **GET /user/profile** → `200`, `data`: caller's profile.
- **PUT /user/profile** — body: `{ displayName?: string (1-60), avatarUrl?: string (url), bio?: string (max 500) }` → `200`.
- **POST /user/preferences** — body: `{ favouriteGenres?: string[], favouriteArtists?: string[], favouriteLanguages?: string[], favouriteAlbums?: string[], favouriteMoods?: string[] }` → `200`.
- **GET /user/preferences** → `200`, `data`: stored preference lists.
- **POST /user/history** — body: `{ spotifyTrackId: string, albumId?, artistId?, genre?, device?, sessionDuration?: number, listenPercentage?: number (0-100), completedSong?: boolean, numberOfReplays?: number }` → `200`.
- **POST /user/likes** — body: `{ targetId: string, type?: 'song'|'album'|'artist' (default 'song') }` → `200`.
- **POST /user/dislikes** — body: `{ trackId: string }` → `200`.
- **POST /user/skip** — body: `{ trackId: string, skipTime?: number, duration?: number }` → `200`.

---

## AI — `/api/ai`

Every route in this file requires auth (`router.use(authenticate)` — no per-route optional/none tier).

| Method | Path |
|---|---|
| GET | `/ai/recommendations` |
| POST | `/ai/lyrics/analyze` |
| POST | `/ai/playlist/generate` |

- **GET /ai/recommendations** — query: `mood?: string` → `200`, `data`: track recommendations. **Currently a hardcoded mock** (`AIService.getRecommendations`) — not wired to real user history yet.
- **POST /ai/lyrics/analyze** — body: `{ trackId: string, lyrics: string }` → `200`, `data: { mood, meaning, trivia }`. **Currently a hardcoded mock** (`AIService.analyzeLyrics`) regardless of input.
- **POST /ai/playlist/generate** — body: `{ prompt: string, playlistName?: string }` → real rule-based (no LLM) keyword/regex prompt parsing, routed into the catalog/artist infrastructure:
  - On a match → `201`, `data: { playlistId, title, trackCount }` (persisted as a real Playlist).
  - On no recognizable genre/mood/era/artist signal in the prompt → `200`, `data: { playlistId: null, title: null, trackCount: 0, tracks: [], message: string }` — not an error.

---

## Health — `/api/health`

No auth on any of these (used by orchestrators/load balancers).

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Legacy/basic — always `200 { status: 'ok', timestamp }`. |
| GET | `/health/live` | Liveness — process responsive, no dependency checks. Always `200`. |
| GET | `/health/ready` | Readiness — `200 { status: 'ok', checks: { database: 'ok' } }` if a DB query succeeds within 3s; `503 { status: 'not_ready', checks: { database: 'unreachable' } }` otherwise. |

---

## Error status codes used across the API

| Code | Meaning here |
|---|---|
| 400 | Validation failure (zod schema) or malformed request |
| 401 | Missing/invalid/expired auth token |
| 403 | Missing/invalid CSRF token |
| 404 | Resource genuinely doesn't exist (never used for "upstream is down") |
| 429 | Rate limit exceeded |
| 500 | Unhandled server error |
| 503 | The JioSaavn upstream is unavailable (`SaavnUpstreamError`) — distinct from a genuine 404, and distinct from a healthy-but-empty result |

## Note on Swagger coverage

`/api/docs` (when enabled) only has `@swagger` JSDoc annotations on `auth`, `music`, `artist`, `playlist`, and `search` routes — `ai`, `recommendation`, `user`, and `health` routes have none and won't appear there. This document is the complete source; Swagger is a partial supplement, not a superset.
