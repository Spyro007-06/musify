# Recommendation system

How Musify decides what to recommend, how the model is trained/refreshed,
how to evaluate it, and where to tune it.

## Why this exists

The previous `RecommendationService` was a hand-tuned heuristic: fixed point
weights (35% history, 20% genre, 15% artist, ...) computed fresh on every
request, with no cross-user learning — two users with the same favourite
genre got identical results. `RecommendationScores` existed in the schema
but nothing wrote to it.

This replaces the *scoring* with a real model: implicit feedback → item-based
collaborative filtering, blended with a content-based fallback for cold
start, computed periodically and read cheaply at request time. The
controller/route contracts and response shape (`{ success, message, data,
meta? }`) are unchanged — see `src/controllers/recommendation.controller.ts`.

## 1. Signals → implicit rating

`src/services/recommendation/implicitFeedback.ts` turns raw events into a
single normalized rating per `(user, track)` in `[-1, 1]`:

| Signal | Score |
|---|---|
| Completed + replayed | `1.0` |
| Completed, no replay | `0.8` |
| Partial listen, ≥50% | `0.45` – `0.6`, scaled by how far they got |
| Partial listen, <50% (no explicit skip event) | `-0.2` to `-0.8`, worse the earlier it stopped |
| Explicit skip (`SkippedSongs`) | `-0.9` to `-0.3`, worse the earlier the skip |
| Like (`LikedTrack`) | `1.0`, **overrides** the implicit average |
| Dislike (`DislikedSong`) | `-1.0`, **overrides** the implicit average |

Multiple raw events for the same `(user, track)` are averaged
(`aggregateEventScores`) before the like/dislike override is applied
(`applyExplicitOverride`) — see that file for the exact curve.

## 2. Collaborative filtering (the actual learning)

`src/services/recommendation/collaborativeFiltering.ts` — **item-based CF**
with cosine similarity, not matrix factorization. Reasoning: the track
catalog is external (JioSaavn), not something we own and pre-index, so
there's no fixed item universe to factorize ahead of time; item-based CF
computes similarity on demand from whoever happens to have rated both
tracks, which fits an open catalog and needs no extra dependency.

- Build a global `userId -> trackId -> rating` matrix from every user's
  implicit ratings (`engine.buildRatingMatrix`).
- Invert it to `trackId -> userId -> rating` (`buildItemRaters`).
- For a candidate track, similarity to a track the user already rated is
  cosine similarity over the set of users who rated *both* tracks
  (`itemSimilarity`).
- A candidate's CF score is the similarity-weighted average of the user's
  own ratings on similar tracks (`scoreCandidateForUser`) — the standard
  item-based "adjusted weighted sum".

This is what makes it "real": a track gets recommended because people whose
taste overlaps with yours rated it well, not because it matches a keyword in
your profile.

## 3. Content-based fallback / blend

`src/services/recommendation/contentBased.ts` scores a track against the
user's `GenreAffinity` (fuzzy string match — genre is really a
language/style string) and `ArtistAffinity` (**exact Saavn artist ID
match** — see the "ID bug" note below).

The two are blended per user, weighted by how much rating history they have
(`collaborativeWeight`): 0 ratings → pure content-based, 20+ ratings → CF
fully takes over. This is what handles cold start without a special case in
the request path.

### The ID-vs-name bug this replaces

Before this rewrite, several functions compared a stored artist **ID**
(`ArtistAffinity.spotifyArtistId`, `ListeningHistory.artistId`,
`UserPreferences.favouriteArtists`) against a track's artist **name**
(`track.artists[].name`) via substring matching — which almost never
matched, so "favorite artist" scoring silently did nothing. Every place that
now needs to check artist identity matches on `track.artists[].id` instead
(a real Saavn artist ID, confirmed by how `followArtist` populates that
field). If you add a new content signal, match on ID, not name.

## 4. Periodic recompute, not per-request

`src/services/recommendation/engine.ts` : `recomputeAllUserScores()` does
the heavy lifting — fetches up to 20k recent rows from `ListeningHistory`
and `SkippedSongs` plus all `LikedTrack`/`DislikedSong` rows, builds the
rating matrix, picks a candidate pool (the 500 tracks with the most raters
— `CANDIDATE_POOL_SIZE`), batch-fetches their metadata from Saavn, and for
every user with at least one rating, blends CF + content into a score,
writes the top 60 (`TOP_N_PER_USER`) to `RecommendationScores`, and clears
their `RecommendationCache` so the next dashboard read is fresh.

Runs:
- **On a schedule** — `src/jobs/recommendationCron.ts`, started from
  `server.ts` at boot (skipped in `NODE_ENV=test`). Default `0 */6 * * *`
  (every 6 hours); override with `RECOMMENDATION_CRON_SCHEDULE` (standard
  cron syntax) for local testing, e.g. `*/5 * * * *`.
- **On demand**:
  ```bash
  npm run recommendations:compute
  ```

`ponytail:` the candidate pool and per-user top-N are both fixed caps with
no pagination/sharding — fine at hobby-project scale; if the active user or
catalog count grows into the thousands, shard the recompute by user cohort
instead of doing all users in one process.

## 5. Request-time path

`RecommendationService.scoreCandidates` (used by
`getDashboardRecommendations`, `getRecommendedSongs`, `getDiscoverWeekly`)
now:
1. Reads precomputed scores for the user from `RecommendationScores`
   (cheap, no computation).
2. Falls back to a live (lighter-weight) content-based score for any
   candidate not in the precomputed set — new tracks, or a user the cron
   hasn't scored yet.
3. Applies small real-time nudges on top: liked/recently-played, time of
   day, and last-24h trending — signals that are about *right now* and
   don't belong baked into a periodically-refreshed model.

`generateSmartQueue` (the "what plays next" context-aware queue) is
unchanged in spirit — it's inherently a real-time, current-track-context
computation — but now also adds the user's precomputed score as one more
input alongside artist/genre/mood/trending context.

The diversity/anti-repetition logic (`getDiverseTracksForSection` in
`getDashboardRecommendations`, and the artist-repetition penalty in
`generateSmartQueue`) is untouched — it was already doing the right thing at
the right layer.

## 6. Feedback loop

Every write path that logs a signal feeds the next recompute:

| Endpoint | Writes to | Read by engine as |
|---|---|---|
| `POST /api/user/history` | `ListeningHistory` (+ `GenreAffinity`/`ArtistAffinity` bump on completion) | play events |
| `POST /api/user/skip` | `ListeningHistory` + `SkippedSongs` | play + skip events |
| `POST /api/user/likes` | `LikedTrack` (+ `ArtistAffinity` bump for artist follows) | explicit override |
| `POST /api/user/dislikes` | `DislikedSong` | explicit override |
| `POST /api/recommendations/feedback` | routes to the above via `action: complete\|skip\|replay` | same as above |
| `POST /api/user/preferences` | `UserPreferences`, `GenreAffinity`, `ArtistAffinity` | content-based affinities |

`SearchHistory` is now actually written (`SearchService.search`, previously
dead) but is not yet folded into scoring — it's available for a future
signal, not currently weighted.

`MoodHistory` is still unused end-to-end (no write path exists either) —
known gap, out of scope for this pass; the closest thing today is the
real-time time-of-day nudge in `scoreCandidates`.

## 7. Evaluation

```bash
npm run recommendations:evaluate [-- --topK=20 --minRatings=6]
```

For every user with at least `minRatings` positively-rated tracks, holds out
~20% of them, rebuilds the CF matrix as if those ratings didn't exist
(`cloneMatrixWithoutTracks`/`cloneItemRatersWithoutUser` in
`evaluateRecommendations.ts`), and checks how often the held-out tracks come
back in the top-K recommendations computed from everyone else's behavior.

Reports Precision@K, Recall, and hit-rate (% of users where at least one
held-out track was recovered). This deliberately evaluates **CF in
isolation** (no content blending): a system that only restates
genre/artist preferences has no way to "guess" a specific held-out track
from other users' behavior, so a hit-rate meaningfully above the
`topK / candidatePoolSize` chance baseline is evidence the model is learning
cross-user patterns, not just echoing the profile back.

With too little seed data (few users, little history) the script will
report 0 evaluable users — that's expected, not a bug; generate some
listening/like activity first.

## 8. Tuning

| Knob | Where | Effect |
|---|---|---|
| Event → rating curve | `implicitFeedback.ts` | how strongly completion/skip/replay affect the rating |
| `GENRE_WEIGHT` / `ARTIST_WEIGHT` | `contentBased.ts` | content-based blend between genre and artist match |
| `collaborativeWeight` fullConfidenceAt | `contentBased.ts` (default 20) | how many ratings before CF fully dominates content |
| `CANDIDATE_POOL_SIZE` | `engine.ts` (default 500) | how many globally-popular tracks are eligible candidates |
| `TOP_N_PER_USER` | `engine.ts` (default 60) | how many scores get persisted per user |
| `RECOMMENDATION_CRON_SCHEDULE` | env var | how often the model refreshes |
