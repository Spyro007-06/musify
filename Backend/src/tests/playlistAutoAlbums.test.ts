import './setup/saavnMock';
import { PlaylistService } from '@services/playlist.service';
import { prismaMock } from './setup/prismaMock';
import { saavnMock } from './setup/saavnMock';

const track = (id: string, albumId: string) => ({ id, album: { id: albumId, title: `Album ${albumId}`, artwork: null } });

describe('PlaylistService.getPlaylists — auto albums', () => {
  it('reads only recent activity, keeps newest albums first, caps at 24, and counts songs', async () => {
    prismaMock.playlist.findMany.mockResolvedValue([]);
    prismaMock.listeningHistory.findMany.mockResolvedValue([{ trackId: 't-new' }, { trackId: 't-old' }] as any);
    prismaMock.likedTrack.findMany.mockResolvedValue([{ trackId: 't-new2' }] as any);
    prismaMock.playlistTrack.findMany.mockResolvedValue([]);
    // The catalog answers out of order; 30 extra albums come from older plays.
    const extras = Array.from({ length: 30 }, (_, i) => track(`x${i}`, `old${i}`));
    saavnMock.getTracks.mockResolvedValue([track('t-old', 'A2'), ...extras, track('t-new', 'A1'), track('t-new2', 'A1')]);

    const result = await PlaylistService.getPlaylists('user-1');

    expect(prismaMock.listeningHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { timestamp: 'desc' }, take: 200 })
    );
    expect(result).toHaveLength(24);
    expect(result[0]).toMatchObject({ id: 'movie-A1', tracksCount: 2, description: '2 songs from your listening' });
    expect(result[1]).toMatchObject({ id: 'movie-A2', tracksCount: 1, description: '1 song from your listening' });
  });
});
