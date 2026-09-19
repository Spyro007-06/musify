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
    expect(result.some((t: any) => t.id === 'jazz-pick')).toBe(true);
    // The genre branch returns before ever touching the likes/history signal query.
    expect(prismaMock.listeningHistory.findMany).not.toHaveBeenCalled();
  });

  it('falls back to likes/history-derived recs when the user has no favourite genres', async () => {
    prismaMock.genreAffinity.findMany.mockResolvedValue([]);
    prismaMock.likedTrack.findMany.mockResolvedValue([{ userId: 'user-1', spotifyTrackId: 'liked-1' } as any]);
    prismaMock.listeningHistory.findMany.mockResolvedValue([]);
    prismaMock.artistAffinity.findMany.mockResolvedValue([]);
    saavnMock.getTracks.mockResolvedValue([track({ id: 'liked-1', genre: 'hindi' })]);
    saavnMock.getRecommendations.mockResolvedValue([track({ id: 'history-based-pick' })]);

    const result = await MusicService.getRecommended('user-1');

    expect(saavnMock.getRecommendationsByGenres).not.toHaveBeenCalled();
    expect(result.some((t: any) => t.id === 'history-based-pick')).toBe(true);
  });

  it('falls back to generic trending for a user with no genres, likes, or history', async () => {
    prismaMock.genreAffinity.findMany.mockResolvedValue([]);
    prismaMock.likedTrack.findMany.mockResolvedValue([]);
    prismaMock.listeningHistory.findMany.mockResolvedValue([]);
    prismaMock.artistAffinity.findMany.mockResolvedValue([]);
    saavnMock.getRecommendedTracks.mockResolvedValue([track({ id: 'generic-trending' })]);

    const result = await MusicService.getRecommended('user-1');

    expect(result.some((t: any) => t.id === 'generic-trending')).toBe(true);
  });
});
