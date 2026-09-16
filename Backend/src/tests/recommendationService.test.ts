import './setup/saavnMock';
import { RecommendationService } from '@services/recommendation.service';
import { prismaMock } from './setup/prismaMock';
import { saavnMock } from './setup/saavnMock';

// scoreCandidates/computeDashboardRecommendations/generateSmartQueue are
// private — accessed via bracket notation, a standard technique for testing
// a static utility class's core logic directly rather than only through its
// public wrappers. TypeScript `private` is compile-time only; this doesn't
// change the production API surface.
const svc = RecommendationService as any;

const track = (overrides: Partial<any> = {}) => ({
  id: 'track-1',
  title: 'Test Song',
  genre: 'pop',
  artists: [{ id: 'artist-1', name: 'Test Artist' }],
  playCount: 1000,
  year: 2020,
  ...overrides,
});

function mockScoreCandidatesDeps(overrides: {
  precomputed?: any[];
  likes?: any[];
  recentlyPlayed?: any[];
  genreRows?: any[];
  artistRows?: any[];
  trendingGroups?: any[];
} = {}) {
  prismaMock.recommendationScores.findMany.mockResolvedValue(overrides.precomputed ?? []);
  prismaMock.likedTrack.findMany.mockResolvedValue(overrides.likes ?? []);
  prismaMock.listeningHistory.findMany.mockResolvedValue(overrides.recentlyPlayed ?? []);
  prismaMock.genreAffinity.findMany.mockResolvedValue(overrides.genreRows ?? []);
  prismaMock.artistAffinity.findMany.mockResolvedValue(overrides.artistRows ?? []);
  // groupBy's generic overload signature confuses jest-mock-extended's typing; cast to a plain jest.Mock.
  (prismaMock.listeningHistory.groupBy as unknown as jest.Mock).mockResolvedValue(overrides.trendingGroups ?? []);
}

describe('scoreCandidates — each signal moves the score in the right direction', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('a track with zero matching signals gets a well-defined score (0), not NaN/undefined', async () => {
    // Neutral hour (13:00) avoids the morning/evening time-of-day bonus so this
    // isolates the "no signal at all" case cleanly.
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T13:00:00'));
    mockScoreCandidatesDeps();

    const [scored] = await svc.scoreCandidates('user-1', [track({ genre: 'unmatched-genre' })]);

    expect(scored.score).toBe(0);
    expect(Number.isNaN(scored.score)).toBe(false);
  });

  it('a precomputed score (from the periodic model) drives a much higher score than a candidate with none', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T13:00:00'));
    mockScoreCandidatesDeps({ precomputed: [{ userId: 'user-1', spotifyTrackId: 'track-1', score: 0.9, reason: 'Because you like this' } as any] });

    const [scored] = await svc.scoreCandidates('user-1', [track()]);

    expect(scored.score).toBeCloseTo(90);
    expect(scored.reason).toBe('Because you like this');
  });

  it('a genre/artist affinity match (content-based fallback) scores higher than no match at all', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T13:00:00'));
    mockScoreCandidatesDeps({
      genreRows: [{ userId: 'user-1', genre: 'pop', score: 30 } as any],
      artistRows: [{ userId: 'user-1', spotifyArtistId: 'artist-1', score: 30 } as any],
    });
    const [withMatch] = await svc.scoreCandidates('user-1', [track({ id: 'match', genre: 'pop' })]);

    mockScoreCandidatesDeps(); // no affinity rows
    const [noMatch] = await svc.scoreCandidates('user-1', [track({ id: 'no-match', genre: 'unmatched-genre' })]);

    expect(withMatch.score).toBeGreaterThan(noMatch.score);
  });

  it('a liked track scores higher than an otherwise-identical unliked track', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T13:00:00'));
    mockScoreCandidatesDeps({ likes: [{ userId: 'user-1', spotifyTrackId: 'track-1' } as any] });
    const [liked] = await svc.scoreCandidates('user-1', [track()]);

    mockScoreCandidatesDeps();
    const [unliked] = await svc.scoreCandidates('user-1', [track()]);

    expect(liked.score).toBeGreaterThan(unliked.score);
  });

  it('a recently-played track scores higher than one that has not been played', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T13:00:00'));
    mockScoreCandidatesDeps({ recentlyPlayed: [{ spotifyTrackId: 'track-1' } as any] });
    const [recent] = await svc.scoreCandidates('user-1', [track()]);

    mockScoreCandidatesDeps();
    const [notRecent] = await svc.scoreCandidates('user-1', [track()]);

    expect(recent.score).toBeGreaterThan(notRecent.score);
  });

  it('a morning-appropriate genre scores higher in the morning than a non-matching genre', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T08:00:00')); // 8am -> isMorning
    mockScoreCandidatesDeps();
    const [popTrack] = await svc.scoreCandidates('user-1', [track({ genre: 'pop' })]);

    mockScoreCandidatesDeps();
    const [otherTrack] = await svc.scoreCandidates('user-1', [track({ genre: 'unmatched-genre' })]);

    expect(popTrack.score).toBeGreaterThan(otherTrack.score);
  });

  it('an evening-appropriate genre scores higher in the evening than a non-matching genre', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T20:00:00')); // 8pm -> isEvening
    mockScoreCandidatesDeps();
    const [chillTrack] = await svc.scoreCandidates('user-1', [track({ genre: 'lofi' })]);

    mockScoreCandidatesDeps();
    const [otherTrack] = await svc.scoreCandidates('user-1', [track({ genre: 'unmatched-genre' })]);

    expect(chillTrack.score).toBeGreaterThan(otherTrack.score);
  });

  it('a trending track (last-24h global play count) scores higher and is flagged isTrending', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T13:00:00'));
    mockScoreCandidatesDeps({ trendingGroups: [{ spotifyTrackId: 'track-1', _count: { spotifyTrackId: 50 } } as any] });
    const [trending] = await svc.scoreCandidates('user-1', [track()]);

    mockScoreCandidatesDeps();
    const [notTrending] = await svc.scoreCandidates('user-1', [track({ playCount: 10 })]);

    expect(trending.score).toBeGreaterThan(notTrending.score);
    expect(trending.isTrending).toBe(true);
  });

  it('score never exceeds 100 even when every signal stacks', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T08:00:00'));
    mockScoreCandidatesDeps({
      precomputed: [{ userId: 'user-1', spotifyTrackId: 'track-1', score: 1.0, reason: 'x' } as any],
      likes: [{ userId: 'user-1', spotifyTrackId: 'track-1' } as any],
      recentlyPlayed: [{ spotifyTrackId: 'track-1' } as any],
      trendingGroups: [{ spotifyTrackId: 'track-1', _count: { spotifyTrackId: 50 } } as any],
    });

    const [scored] = await svc.scoreCandidates('user-1', [track({ genre: 'pop' })]);

    expect(scored.score).toBe(100);
  });

  it('degrades to an empty list rather than throwing when a dependency query fails', async () => {
    prismaMock.recommendationScores.findMany.mockRejectedValue(new Error('db down'));
    const result = await svc.scoreCandidates('user-1', [track()]);
    expect(result).toEqual([]);
  });
});

function mockCandidatePoolDeps() {
  prismaMock.userPreferences.findUnique.mockResolvedValue(null);
  prismaMock.genreAffinity.findMany.mockResolvedValue([]);
  prismaMock.artistAffinity.findMany.mockResolvedValue([]);
  prismaMock.likedTrack.findMany.mockResolvedValue([]);
  prismaMock.searchHistory.findMany.mockResolvedValue([]);
  prismaMock.recommendationScores.findMany.mockResolvedValue([]);
  prismaMock.listeningHistory.findMany.mockResolvedValue([]);
  (prismaMock.listeningHistory.groupBy as unknown as jest.Mock).mockResolvedValue([]);
  saavnMock.getTrendingTracks.mockResolvedValue([]);
  saavnMock.getNewReleases.mockResolvedValue([]);
  saavnMock.getTracks.mockResolvedValue([]);
}

describe('getDashboardRecommendations — cache behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T13:00:00'));
    mockCandidatePoolDeps();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns cached sections without recomputing when a valid (non-expired) cache exists', async () => {
    prismaMock.recommendationCache.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        sectionType: 'time-of-day',
        cachedData: { title: 'Good Afternoon', subtitle: 'x', type: 'tracks', items: [track()] },
        expiresAt: new Date('2026-01-01T14:00:00'),
      } as any,
    ]);

    const result = await svc.getDashboardRecommendations('user-1');

    expect(result).toEqual([expect.objectContaining({ id: 'time-of-day', title: 'Good Afternoon' })]);
    expect(saavnMock.getTrendingTracks).not.toHaveBeenCalled(); // never recomputed
  });

  it('recomputes when the cache is empty (cold user) and writes fresh sections back', async () => {
    prismaMock.recommendationCache.findMany.mockResolvedValue([]);
    prismaMock.recommendationCache.upsert.mockResolvedValue({} as any);

    const result = await svc.getDashboardRecommendations('user-1');

    expect(Array.isArray(result)).toBe(true);
    expect(saavnMock.getTrendingTracks).toHaveBeenCalled(); // candidate pool was actually built
    expect(prismaMock.recommendationCache.upsert).toHaveBeenCalled(); // and cached
  });

  it('FINDING: "Because You Like X" never appears, even with a clear top-played artist and a matching candidate — getTopPlayedArtist returns an artist ID, but the section filter matches it against track artist NAMES', async () => {
    // Same class of ID-vs-name bug already fixed in ArtistService/RecommendationService.getRecommendedArtists,
    // present here too: getTopPlayedArtist() returns ListeningHistory.artistId (a real Saavn artist ID,
    // e.g. "artist-1"), but the section's filter does
    // `trackArtists.some(name => name.includes(targetArtist.toLowerCase()))` — comparing an ID against
    // track.artists[].name. An ID is never a substring of a display name, so this never matches.
    prismaMock.recommendationCache.findMany.mockResolvedValue([]);
    prismaMock.recommendationCache.upsert.mockResolvedValue({} as any);
    saavnMock.getTrendingTracks.mockResolvedValue([track({ id: 't1', artists: [{ id: 'artist-1', name: 'Favourite Artist' }] })]);
    prismaMock.listeningHistory.findMany.mockImplementation((async (args: any) => {
      if (args?.where?.completedSong === true) {
        return [{ artistId: 'artist-1' }]; // a real artist ID, not a name
      }
      return [];
    }) as any);

    const withHistory = await svc.getDashboardRecommendations('user-1');

    // Documents current (buggy) behavior — the section is absent despite a real signal existing.
    expect(withHistory.some((s: any) => s.id === 'because-you-like')).toBe(false);
  });

  it('omits the "Because You Like X" section when there is no listening history and no favourite artist preference', async () => {
    prismaMock.recommendationCache.findMany.mockResolvedValue([]);
    prismaMock.recommendationCache.upsert.mockResolvedValue({} as any);
    // no completed history -> getTopPlayedArtist returns null; no favouriteArtists prefs either
    prismaMock.listeningHistory.findMany.mockResolvedValue([]);

    const result = await svc.getDashboardRecommendations('user-2');

    expect(result.some((s: any) => s.id === 'because-you-like')).toBe(false);
  });

  it('dedupes concurrent cache-miss requests for the same user into a single computation', async () => {
    prismaMock.recommendationCache.findMany.mockResolvedValue([]);
    prismaMock.recommendationCache.upsert.mockResolvedValue({} as any);
    const computeSpy = jest.spyOn(svc, 'computeDashboardRecommendations');

    const [a, b] = await Promise.all([
      svc.getDashboardRecommendations('user-3'),
      svc.getDashboardRecommendations('user-3'),
    ]);

    expect(a).toBe(b); // same resolved array reference -> one shared computation, not two
    expect(computeSpy).toHaveBeenCalledTimes(1);
    computeSpy.mockRestore();
  });

  it('a single dashboard computation fetches the candidate pool once, not twice — Discover Weekly reuses the already-scored candidates', async () => {
    prismaMock.recommendationCache.findMany.mockResolvedValue([]);
    prismaMock.recommendationCache.upsert.mockResolvedValue({} as any);

    await svc.getDashboardRecommendations('user-4');

    // Previously 2: computeDashboardRecommendations built one candidate
    // pool for its main sections, then getDiscoverWeekly (called for the
    // "Discover Weekly" section) independently rebuilt its own. Fixed by
    // routing that section through buildDiscoverWeekly(userId, scored)
    // instead of the public getDiscoverWeekly wrapper.
    expect(saavnMock.getTrendingTracks).toHaveBeenCalledTimes(1);
  });
});

function mockSmartQueueDeps(overrides: { history?: any[]; precomputed?: any[]; trendingGroups?: any[] } = {}) {
  prismaMock.listeningHistory.findMany.mockResolvedValue(overrides.history ?? []);
  prismaMock.recommendationScores.findMany.mockResolvedValue(overrides.precomputed ?? []);
  (prismaMock.listeningHistory.groupBy as unknown as jest.Mock).mockResolvedValue(overrides.trendingGroups ?? []);
  mockCandidatePoolDeps();
}

describe('generateSmartQueue', () => {
  const context = { trackId: 'currently-playing', artistName: 'The Artist', genre: 'pop', mood: 'happy' };

  it('never includes the currently-playing track in the returned queue', async () => {
    saavnMock.search.mockResolvedValue({ artists: [{ id: 'artist-x', name: 'The Artist' }], tracks: [], albums: [], playlists: [] });
    saavnMock.getArtistTopTracks.mockResolvedValue([track({ id: 'currently-playing' }), track({ id: 'other' })]);
    saavnMock.getRelatedArtists.mockResolvedValue([]);
    mockSmartQueueDeps();

    const queue = await svc.generateSmartQueue('user-1', context);

    expect(queue.some((t: any) => t.id === 'currently-playing')).toBe(false);
  });

  it('ranks a track matching the current artist/genre/mood context higher than one matching nothing', async () => {
    saavnMock.search.mockResolvedValue({ artists: [], tracks: [], albums: [], playlists: [] });
    saavnMock.getArtistTopTracks.mockResolvedValue([]);
    saavnMock.getRelatedArtists.mockResolvedValue([]);
    mockSmartQueueDeps();
    mockCandidatePoolDeps();
    saavnMock.getTrendingTracks.mockResolvedValue([
      track({ id: 'strong-match', title: 'Happy Song', genre: 'pop', artists: [{ id: 'a1', name: 'The Artist' }] }),
      track({ id: 'no-match', title: 'Other', genre: 'unrelated', artists: [{ id: 'a2', name: 'Someone Else' }] }),
    ]);

    const queue = await svc.generateSmartQueue('user-1', context);

    const strongIdx = queue.findIndex((t: any) => t.id === 'strong-match');
    const noMatchIdx = queue.findIndex((t: any) => t.id === 'no-match');
    expect(strongIdx).toBeGreaterThanOrEqual(0);
    expect(noMatchIdx).toBeGreaterThanOrEqual(0);
    expect(strongIdx).toBeLessThan(noMatchIdx); // higher-scored track ranks earlier
  });

  it('anti-repetition penalty pushes variety above a repeated high-scoring artist', async () => {
    // Context: artistName 'The Artist', genre 'pop'. Same-artist+genre-match
    // tracks score 30 (artist) + 25 (genre) = 55; different-artist tracks
    // that still match genre score 10 (related-artist fallback) + 25
    // (genre) = 35. A 25-point-per-repeat penalty means after one
    // same-artist pick, its remaining tracks (55 - 25 = 30) score BELOW the
    // different-artist tracks (35) — so the second pick should be variety,
    // not another same-artist track back to back.
    saavnMock.search.mockResolvedValue({ artists: [], tracks: [], albums: [], playlists: [] });
    saavnMock.getArtistTopTracks.mockResolvedValue([]);
    saavnMock.getRelatedArtists.mockResolvedValue([]);
    mockSmartQueueDeps();
    mockCandidatePoolDeps();
    const sameArtistTracks = Array.from({ length: 5 }, (_, i) =>
      track({ id: `same-artist-${i}`, genre: 'pop', artists: [{ id: 'a1', name: 'The Artist' }] })
    );
    const otherArtistTracks = Array.from({ length: 3 }, (_, i) =>
      track({ id: `other-artist-${i}`, genre: 'pop', artists: [{ id: 'a2', name: 'Someone Else' }] })
    );
    saavnMock.getTrendingTracks.mockResolvedValue([...sameArtistTracks, ...otherArtistTracks]);

    const queue = await svc.generateSmartQueue('user-1', context);

    expect(queue[0].artists[0].name).toBe('The Artist'); // highest raw score picked first
    expect(queue[1].artists[0].name).not.toBe('The Artist'); // repeat penalty pushed variety up
  });

  it('returns an empty array (not a crash) when an unexpected error occurs mid-computation', async () => {
    saavnMock.search.mockRejectedValue(new Error('upstream exploded'));
    const queue = await svc.generateSmartQueue('user-1', context);
    expect(queue).toEqual([]);
  });
});

describe('getRecommendedSongs', () => {
  it('returns tracks sorted best-first and respects the limit param', async () => {
    mockCandidatePoolDeps();
    saavnMock.getTrendingTracks.mockResolvedValue([
      track({ id: 'low', genre: 'unmatched' }),
      track({ id: 'high', genre: 'pop' }),
    ]);
    prismaMock.recommendationScores.findMany.mockResolvedValue([
      { userId: 'user-1', spotifyTrackId: 'high', score: 0.9, reason: 'x' } as any,
    ]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);

    const result = await RecommendationService.getRecommendedSongs('user-1', 1);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('high');
  });
});

describe('getRecommendedAlbums', () => {
  it('scores an album by a followed/history artist higher than one with no connection (matches by real artist id, not name)', async () => {
    prismaMock.userPreferences.findUnique.mockResolvedValue(null);
    prismaMock.genreAffinity.findMany.mockResolvedValue([]);
    prismaMock.artistAffinity.findMany.mockResolvedValue([{ userId: 'user-1', spotifyArtistId: 'artist-1' } as any]);
    prismaMock.listeningHistory.findMany.mockResolvedValue([]);
    saavnMock.getNewReleases.mockResolvedValue([
      { id: 'album-known', artist: { id: 'artist-1', name: 'Known' }, genre: 'pop', tracks: [] },
      { id: 'album-unknown', artist: { id: 'artist-2', name: 'Unknown' }, genre: 'pop', tracks: [] },
    ]);

    const result = await RecommendationService.getRecommendedAlbums('user-1', 2);

    expect(result[0].id).toBe('album-known'); // higher-scored album (matched artist) ranks first
  });
});

describe('getDiscoverWeekly', () => {
  it('excludes tracks already in the user\'s listening history', async () => {
    mockCandidatePoolDeps();
    saavnMock.getTrendingTracks.mockResolvedValue([track({ id: 'already-heard' }), track({ id: 'new-to-me' })]);
    prismaMock.listeningHistory.findMany.mockResolvedValue([{ spotifyTrackId: 'already-heard' } as any]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);

    const result = await RecommendationService.getDiscoverWeekly('user-1');

    expect(result.some((t: any) => t.id === 'already-heard')).toBe(false);
    expect(result.some((t: any) => t.id === 'new-to-me')).toBe(true);
  });
});
