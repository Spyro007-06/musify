import './setup/saavnMock';
import { MusicService } from '@services/music.service';
import { prismaMock } from './setup/prismaMock';
import { saavnMock } from './setup/saavnMock';

const track = (overrides: Partial<any> = {}) => ({
  id: 'track-1',
  title: 'Test Song',
  genre: 'pop',
  artists: [{ id: 'artist-1', name: 'Test Artist' }],
  ...overrides,
});

describe('MusicService.getRecommended', () => {
  it('prioritizes explicit favourite genres over likes/history/generic trending', async () => {
    prismaMock.genreAffinity.findMany.mockResolvedValue([
      { userId: 'user-1', genre: 'jazz', score: 10 } as any,
    ]);
    saavnMock.getRecommendationsByGenres.mockResolvedValue([track({ id: 'jazz-pick' })]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);

    const result = await MusicService.getRecommended('user-1');

    expect(saavnMock.getRecommendationsByGenres).toHaveBeenCalledWith(['jazz'], 20);
    expect(result.tracks.some((t: any) => t.id === 'jazz-pick')).toBe(true);
    expect(result.personalized).toBe(true);
    // The genre branch returns before ever touching the likes/history signal query.
    expect(prismaMock.listeningHistory.findMany).not.toHaveBeenCalled();
  });

  it('falls back to likes/history-derived recs when the user has no favourite genres', async () => {
    prismaMock.genreAffinity.findMany.mockResolvedValue([]);
    prismaMock.likedTrack.findMany.mockResolvedValue([{ userId: 'user-1', trackId: 'liked-1' } as any]);
    prismaMock.listeningHistory.findMany.mockResolvedValue([]);
    prismaMock.artistAffinity.findMany.mockResolvedValue([]);
    saavnMock.getTracks.mockResolvedValue([track({ id: 'liked-1', genre: 'hindi' })]);
    saavnMock.getRecommendations.mockResolvedValue([track({ id: 'history-based-pick' })]);

    const result = await MusicService.getRecommended('user-1');

    expect(saavnMock.getRecommendationsByGenres).not.toHaveBeenCalled();
    expect(result.tracks.some((t: any) => t.id === 'history-based-pick')).toBe(true);
    expect(result.personalized).toBe(true);
  });

  it('falls back to generic trending for a user with no genres, likes, or history', async () => {
    prismaMock.genreAffinity.findMany.mockResolvedValue([]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);
    prismaMock.listeningHistory.findMany.mockResolvedValue([]);
    prismaMock.artistAffinity.findMany.mockResolvedValue([]);
    saavnMock.getRecommendedTracks.mockResolvedValue([track({ id: 'generic-trending' })]);

    const result = await MusicService.getRecommended('user-1');

    expect(result.tracks.some((t: any) => t.id === 'generic-trending')).toBe(true);
    expect(result.personalized).toBe(false);
  });
});

describe('MusicService.getRecentlyPlayed', () => {
  it('collapses repeated plays of the same track into a single, most-recent entry', async () => {
    // Newest first, matching the real query's orderBy — track-1 was played
    // twice, track-2 once.
    prismaMock.listeningHistory.findMany.mockResolvedValue([
      { trackId: 'track-1', timestamp: new Date('2026-01-03') },
      { trackId: 'track-2', timestamp: new Date('2026-01-02') },
      { trackId: 'track-1', timestamp: new Date('2026-01-01') },
    ] as any);
    saavnMock.getTracks.mockResolvedValue([track({ id: 'track-1' }), track({ id: 'track-2' })]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);

    const result = await MusicService.getRecentlyPlayed('user-1');

    expect(result.map((t: any) => t.id)).toEqual(['track-1', 'track-2']);
  });
});

describe('MusicService.getAutoplayTracks', () => {
  const songs = (...ids: string[]) => ids.map((id) => track({ id, title: `Song ${id}` }));

  beforeEach(() => {
    prismaMock.listeningHistory.findMany.mockResolvedValue([{ trackId: 'played' }] as any);
    prismaMock.skippedSongs.findMany.mockResolvedValue([{ trackId: 'skipped' }] as any);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);
  });

  it('skips skipped and already-queued songs, and holds back heard ones while there are enough new', async () => {
    saavnMock.getSongSuggestions.mockResolvedValue(songs('played', 'seed', 'skipped', 'queued', 'n1', 'n2', 'n3', 'n4', 'n5'));

    const result = await MusicService.getAutoplayTracks('user-1', ['seed'], ['queued']);

    expect(saavnMock.getSongSuggestions).toHaveBeenCalledWith('seed');
    expect(result.map((t: any) => t.id)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);
  });

  it('tops up from "Made For You" then trending, and backfills with heard songs so it never runs dry', async () => {
    saavnMock.getSongSuggestions.mockResolvedValue(songs('played', 'n1'));
    const feed = jest
      .spyOn(MusicService, 'getRecommended')
      .mockResolvedValue({ tracks: songs('skipped', 'n1', 'f1'), personalized: true, basis: 'history' });
    const trending = jest.spyOn(MusicService, 'getTrending').mockResolvedValue(songs('f1', 't1'));

    const result = await MusicService.getAutoplayTracks('user-1', ['seed'], []);

    expect(result.map((t: any) => t.id)).toEqual(['n1', 'f1', 't1', 'played']);
    feed.mockRestore();
    trending.mockRestore();
  });
});

describe('MusicService.getRecommended — mood check-in', () => {
  it('serves the active mood in the user\'s languages before any other signal', async () => {
    prismaMock.userPreferences.findUnique.mockResolvedValue({ favouriteLanguages: ['Hindi', 'Tamil'] } as any);
    prismaMock.moodHistory.findFirst.mockResolvedValue({ mood: 'workout' } as any);
    saavnMock.getRecommendationsByGenres.mockResolvedValue([track({ id: 'gym-pick' })]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);

    const result = await MusicService.getRecommended('user-1');

    expect(saavnMock.getRecommendationsByGenres).toHaveBeenCalledWith(['hindi workout', 'tamil workout'], 20);
    expect(result).toMatchObject({ basis: 'mood', mood: 'workout', personalized: true });
    expect(result.tracks.map((t: any) => t.id)).toEqual(['gym-pick']);
    expect(prismaMock.genreAffinity.findMany).not.toHaveBeenCalled();
  });
});
