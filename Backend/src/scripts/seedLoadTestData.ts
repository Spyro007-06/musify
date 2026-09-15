/**
 * LOAD-TEST DATA ONLY — seeds ~1000 synthetic users with realistic volumes
 * of listening history, likes, playlists, and affinities, so DB indexes,
 * N+1 queries, and caching actually get exercised under load. This is NOT
 * general dev seed data; don't run this against a database you care about
 * without cleaning up afterwards (email `%@loadtest.local` identifies every
 * row this script creates, cascaded from the User rows it makes).
 *
 * For basic local-dev seed data (a couple of reference categories + one
 * ready-to-use test login), use `npm run prisma:seed` (prisma/seed.ts)
 * instead — that's the small, idempotent, safe-to-rerun one.
 *
 * Users here are NOT created in Supabase Auth — they're local `User` rows with
 * a random `supabaseId`, and this script mints JWTs for them directly
 * using SUPABASE_JWT_SECRET (which `authenticate` middleware only checks
 * the signature and `sub` claim of — no issuer/audience check — so a
 * locally-signed token for a locally-seeded user is indistinguishable from
 * a real one to the app). This avoids hitting Supabase Auth's admin API
 * ~1000 times just to load-test our own Express/Prisma layer.
 *
 * Track/artist ids are REAL JioSaavn ids (pulled live from the API this
 * script runs against), so hydration endpoints (GET /api/music/tracks/:id
 * etc.) return real data during the load test instead of universally
 * 404ing on fake ids.
 *
 * Usage: npm run seed:loadtest [-- --users=1000]
 */
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '@config/database';
import { SaavnService } from '@services/saavn.service';
import { env } from '@config/env';

const args = process.argv.slice(2);
const getArg = (name: string, fallback: number): number => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? Number(found.split('=')[1]) : fallback;
};

const USER_COUNT = getArg('users', 1000);
const HISTORY_PER_USER_MAX = 80;
const LIKES_PER_USER_MAX = 15;
const CONCURRENCY = 20; // parallel users in flight — this is a remote DB, not localhost

async function inChunks<T>(items: T[], size: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map((item, j) => fn(item, i + j)));
  }
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function randomTimestampWithinDays(days: number, recentWeightDays = 1): Date {
  // Bias some rows into the last `recentWeightDays` so the trending groupBy
  // query (last 24h) has real volume to chew on, not just a flat 30-day spread.
  const useRecent = Math.random() < 0.3;
  const maxMs = (useRecent ? recentWeightDays : days) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - Math.random() * maxMs);
}

/** Pull a diverse pool of real track/artist ids from the live JioSaavn API. */
async function buildCatalogPool(): Promise<{
  tracks: { id: string; genre?: string; artists: { id: string; name: string }[] }[];
  artistIds: string[];
}> {
  const saavn = SaavnService.getInstance();
  const queries = ['hindi hits', 'english pop', 'punjabi beats', 'tamil melodies', 'lofi chill', 'workout edm', 'romantic hits', 'party dance'];

  console.log(`Fetching catalog pool from JioSaavn (${queries.length} queries)...`);
  const results = await Promise.all(queries.map((q) => saavn.search(q)));

  const trackMap = new Map<string, { id: string; genre?: string; artists: { id: string; name: string }[] }>();
  const artistSet = new Set<string>();

  results.forEach((res) => {
    (res.tracks || []).forEach((t: any) => {
      if (t && !trackMap.has(t.id)) {
        trackMap.set(t.id, { id: t.id, genre: t.genre, artists: t.artists || [] });
        (t.artists || []).forEach((a: any) => artistSet.add(a.id));
      }
    });
  });

  const tracks = Array.from(trackMap.values());
  console.log(`Catalog pool: ${tracks.length} real tracks, ${artistSet.size} real artists.`);

  if (tracks.length === 0) {
    throw new Error('Got 0 tracks from JioSaavn — is the external API reachable from here?');
  }

  return { tracks, artistIds: Array.from(artistSet) };
}

async function main() {
  const { tracks, artistIds } = await buildCatalogPool();
  const genres = Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))) as string[];
  const searchQueries = ['workout songs', 'chill lofi', 'romantic hits', 'party dance', 'sad songs', 'road trip music'];

  console.log(`Seeding ${USER_COUNT} users with listening history, likes, playlists...`);

  const tokens: { userId: string; username: string; token: string }[] = [];
  const userIndices = Array.from({ length: USER_COUNT }, (_, i) => i);

  const runId = Date.now().toString(36); // avoids email/username collisions across reruns

  await inChunks(userIndices, CONCURRENCY, async (i) => {
    const supabaseId = randomUUID();
    const username = `loadtest_${runId}_user_${i}`;

    const user = await prisma.user.create({
      data: {
        supabaseId,
        email: `${username}@loadtest.local`,
        username,
        displayName: `Load Test User ${i}`,
        role: 'USER',
        isVerified: true,
        isActive: true,
      },
    });

    const historyCount = randInt(5, HISTORY_PER_USER_MAX);
    const historyTracks = pickN(tracks, historyCount);

    await prisma.listeningHistory.createMany({
      data: historyTracks.map((t) => {
        const completed = Math.random() > 0.3;
        return {
          userId: user.id,
          spotifyTrackId: t.id,
          albumId: undefined,
          artistId: t.artists[0]?.id,
          genre: t.genre,
          timestamp: randomTimestampWithinDays(30),
          listenPercentage: completed ? 100 : randInt(5, 90),
          completedSong: completed,
          numberOfReplays: completed && Math.random() > 0.8 ? randInt(1, 3) : 0,
        };
      }),
    });

    if (Math.random() > 0.6) {
      const skipTracks = pickN(tracks, randInt(1, 5));
      await prisma.skippedSongs.createMany({
        data: skipTracks.map((t) => ({
          userId: user.id,
          spotifyTrackId: t.id,
          skipTime: randInt(2, 60),
          timestamp: randomTimestampWithinDays(30),
        })),
      });
    }

    const likedTracks = pickN(tracks, randInt(0, LIKES_PER_USER_MAX));
    if (likedTracks.length > 0) {
      await prisma.likedTrack.createMany({
        data: likedTracks.map((t) => ({ userId: user.id, spotifyTrackId: t.id })),
        skipDuplicates: true,
      });
    }

    if (artistIds.length > 0 && Math.random() > 0.4) {
      const followedArtists = pickN(artistIds, randInt(1, 5));
      await prisma.artistAffinity.createMany({
        data: followedArtists.map((artistId) => ({
          userId: user.id,
          spotifyArtistId: artistId,
          score: randInt(1, 30),
          isFollowed: Math.random() > 0.3,
        })),
        skipDuplicates: true,
      });
    }

    if (genres.length > 0) {
      const favGenres = pickN(genres, randInt(1, 3));
      await prisma.genreAffinity.createMany({
        data: favGenres.map((genre) => ({ userId: user.id, genre: genre.toLowerCase(), score: randInt(1, 30) })),
        skipDuplicates: true,
      });
    }

    if (Math.random() > 0.5) {
      await prisma.searchHistory.createMany({
        data: pickN(searchQueries, randInt(1, 3)).map((query) => ({
          userId: user.id,
          query,
          createdAt: randomTimestampWithinDays(14),
        })),
      });
    }

    // ~1 in 5 users gets a playlist, so playlist reads have real rows to hit.
    if (Math.random() > 0.8) {
      const playlistTracks = pickN(tracks, randInt(3, 20));
      await prisma.playlist.create({
        data: {
          title: `${username}'s Playlist`,
          slug: `${username}-playlist-${Date.now()}`,
          isPublic: Math.random() > 0.3,
          ownerId: user.id,
          tracks: { create: playlistTracks.map((t) => ({ spotifyTrackId: t.id })) },
        },
      });
    }

    if (i < 20) {
      // Only mint tokens for a sample — the load test only needs a handful of real users to auth as.
      const token = jwt.sign({ sub: supabaseId }, env.SUPABASE_JWT_SECRET);
      tokens.push({ userId: user.id, username, token });
    }

    if ((i + 1) % 100 === 0) console.log(`  ...${i + 1}/${USER_COUNT} users seeded`);
  });

  console.log(`\nDone. Seeded ${USER_COUNT} users.`);
  console.log(`\nSample track id for GET /api/music/tracks/:id -> ${tracks[0].id}`);
  console.log(`Sample auth token (for --token= on npm run loadtest):\n${tokens[0].token}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
