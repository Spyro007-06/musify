import { prisma } from '@config/database';
import { SaavnService } from './saavn.service';
import { MusicService } from './music.service';
import { ApiError } from '@utils/ApiError';
import { ERROR_MESSAGES } from '@constants/messages';
import { uniqueSlug } from '@utils/slugify';

// Auto-built album cards ("movie-<albumId>") come from this much recent activity.
const RECENT_PLAYS_FOR_ALBUMS = 200;
const RECENT_LIKES_FOR_ALBUMS = 100;
const MAX_AUTO_ALBUMS = 24;

export class PlaylistService {
  private static saavn = SaavnService.getInstance();

  public static async getPlaylists(userId: string): Promise<any[]> {
    // Only the user's own: this list backs "Your playlists" and the
    // "Add to playlist" picker, and adding to someone else's playlist is
    // forbidden anyway. (It used to OR in every user's public playlists.)
    const playlists = await prisma.playlist.findMany({
      where: { ownerId: userId },
      include: {
        _count: {
          select: { tracks: true }
        },
        owner: {
          select: { username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const customPlaylists = playlists.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      cover: p.coverUrl || 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80',
      tracksCount: p._count.tracks,
      owner: p.owner.username,
      isPublic: p.isPublic,
    }));

    // Albums from the user's *recent* plays, likes and playlist additions,
    // newest first. Reading all of it made this list (fetched by most pages)
    // look up every song ever played, and grow to hundreds of cards.
    const [recentlyPlayed, likedTracks, playlistTracks] = await Promise.all([
      prisma.listeningHistory.findMany({
        where: { userId },
        select: { trackId: true },
        orderBy: { timestamp: 'desc' },
        take: RECENT_PLAYS_FOR_ALBUMS,
      }),
      prisma.likedTrack.findMany({
        where: { userId },
        select: { trackId: true },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIKES_FOR_ALBUMS,
      }),
      prisma.playlistTrack.findMany({
        where: { playlist: { ownerId: userId } },
        select: { trackId: true },
        orderBy: { addedAt: 'desc' },
        take: RECENT_LIKES_FOR_ALBUMS,
      })
    ]);

    const trackIds = Array.from(new Set([
      ...recentlyPlayed.map((t: any) => t.trackId),
      ...likedTracks.map((t: any) => t.trackId),
      ...playlistTracks.map((t: any) => t.trackId)
    ]));
    const recency = new Map(trackIds.map((id, i) => [id, i]));

    const moviePlaylistsMap = new Map<string, any>();

    if (trackIds.length > 0) {
      try {
        const tracks = (await this.saavn.getTracks(trackIds)).sort(
          (a: any, b: any) => (recency.get(a?.id) ?? Infinity) - (recency.get(b?.id) ?? Infinity)
        );
        for (const track of tracks) {
          if (track && track.album && track.album.id) {
            const albumId = track.album.id;
            if (!moviePlaylistsMap.has(albumId)) {
              moviePlaylistsMap.set(albumId, {
                id: `movie-${albumId}`,
                title: track.album.title,
                description: null,
                cover: track.album.artwork || 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80',
                tracksCount: 0,
                owner: 'Movie Soundtrack',
                isPublic: true,
                trackIdsSet: new Set<string>()
              });
            }
            moviePlaylistsMap.get(albumId).trackIdsSet.add(track.id);
          }
        }
      } catch (err) {
        console.error('Failed to compile movie-sorted playlists:', err);
      }
    }

    const moviePlaylists = Array.from(moviePlaylistsMap.values())
      .slice(0, MAX_AUTO_ALBUMS)
      .map(p => {
        const { trackIdsSet, ...rest } = p;
        const n = trackIdsSet.size;
        return {
          ...rest,
          // Not every album is a film soundtrack (e.g. Eminem's), so describe what it is to the user.
          description: `${n} ${n === 1 ? 'song' : 'songs'} from your listening`,
          tracksCount: n
        };
      });

    return [...customPlaylists, ...moviePlaylists];
  }

  public static async getPlaylist(playlistId: string, userId?: string): Promise<any> {
    if (playlistId.startsWith('movie-')) {
      const albumId = playlistId.replace('movie-', '');
      const album = await this.saavn.getAlbum(albumId);
      if (!album) {
        throw ApiError.notFound(ERROR_MESSAGES.ALBUM_NOT_FOUND);
      }
      return {
        id: playlistId,
        title: album.title,
        description: `The album ${album.title}.`,
        cover: album.artwork || 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80',
        tracksCount: album.tracks?.length || 0,
        owner: 'Movie Soundtrack',
        isPublic: true,
        tracks: await MusicService.populateLikes(album.tracks || [], userId),
      };
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        owner: { select: { username: true } },
        tracks: {
          select: { trackId: true },
          orderBy: [{ position: 'asc' }, { addedAt: 'asc' }]
        }
      }
    });

    if (!playlist) {
      // Not one of ours: home-page rows link straight to JioSaavn editorial playlists.
      const saavnPlaylist = await this.saavn.getPlaylist(playlistId);
      if (!saavnPlaylist) throw ApiError.notFound(ERROR_MESSAGES.PLAYLIST_NOT_FOUND);
      return { ...saavnPlaylist, tracks: await MusicService.populateLikes(saavnPlaylist.tracks, userId) };
    }

    if (!playlist.isPublic && playlist.ownerId !== userId) {
      throw ApiError.forbidden(ERROR_MESSAGES.PLAYLIST_ACCESS_DENIED);
    }

    const trackIds = playlist.tracks.map((t: any) => t.trackId);
    const saavnTracks = await this.saavn.getTracks(trackIds);
    const populatedTracks = await MusicService.populateLikes(saavnTracks, userId);

    return {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      cover: playlist.coverUrl || 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80',
      tracksCount: playlist.tracks.length,
      owner: playlist.owner.username,
      isPublic: playlist.isPublic,
      tracks: populatedTracks,
    };
  }

  public static async createPlaylist(userId: string, payload: { title?: string; description?: string; coverUrl?: string; isPublic?: boolean; albumId?: string }): Promise<any> {
    let title = payload.title || '';
    let description = payload.description || '';
    let coverUrl = payload.coverUrl || '';
    let trackIds: string[] = [];

    if (payload.albumId) {
      const album = await this.saavn.getAlbum(payload.albumId);
      if (!album) {
        throw ApiError.notFound(ERROR_MESSAGES.ALBUM_NOT_FOUND);
      }
      title = album.title;
      description = `From the album ${album.title}.`;
      coverUrl = album.artwork || '';
      trackIds = album.tracks?.map((t: any) => t.id) || [];
    }

    if (!title) {
      throw ApiError.badRequest('Playlist title is required');
    }

    const slug = uniqueSlug(title);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    const playlist = await prisma.playlist.create({
      data: {
        title,
        slug,
        description: description || null,
        coverUrl: coverUrl || null,
        isPublic: payload.isPublic !== undefined ? payload.isPublic : true,
        ownerId: userId,
        tracks: trackIds.length > 0 ? {
          create: trackIds.map((id, i) => ({
            trackId: id,
            position: i
          }))
        } : undefined
      }
    });

    return {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      cover: playlist.coverUrl || 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80',
      tracksCount: trackIds.length,
      owner: user?.username || 'Unknown',
      isPublic: playlist.isPublic,
    };
  }

  public static async addTrackToPlaylist(playlistId: string, trackId: string, userId: string): Promise<void> {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw ApiError.notFound(ERROR_MESSAGES.PLAYLIST_NOT_FOUND);
    }

    if (playlist.ownerId !== userId) {
      throw ApiError.forbidden(ERROR_MESSAGES.PLAYLIST_ACCESS_DENIED);
    }

    // Verify track exists on JioSaavn
    const track = await this.saavn.getTrack(trackId);
    if (!track) {
      throw ApiError.notFound(ERROR_MESSAGES.TRACK_NOT_FOUND);
    }

    const existingTrack = await prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: { playlistId, trackId: trackId }
      }
    });

    if (existingTrack) {
      throw ApiError.conflict(ERROR_MESSAGES.TRACK_ALREADY_IN_PLAYLIST);
    }

    await prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId: trackId,
        position: await this.nextPosition(playlistId),
      }
    });
  }

  /** Position just past the playlist's last track (0 when empty). */
  public static async nextPosition(playlistId: string): Promise<number> {
    const { _max } = await prisma.playlistTrack.aggregate({ where: { playlistId }, _max: { position: true } });
    return _max.position === null ? 0 : _max.position + 1;
  }

  private static async getOwnedPlaylist(playlistId: string, userId: string) {
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist) throw ApiError.notFound(ERROR_MESSAGES.PLAYLIST_NOT_FOUND);
    if (playlist.ownerId !== userId) throw ApiError.forbidden(ERROR_MESSAGES.PLAYLIST_ACCESS_DENIED);
    return playlist;
  }

  public static async updatePlaylist(
    playlistId: string,
    userId: string,
    data: { title?: string; description?: string; coverUrl?: string; isPublic?: boolean }
  ): Promise<any> {
    await this.getOwnedPlaylist(playlistId, userId);
    const playlist = await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        ...data,
        ...(data.title !== undefined && { slug: uniqueSlug(data.title) }),
        // An empty string clears it rather than storing "".
        ...(data.description !== undefined && { description: data.description.trim() || null }),
      },
    });
    return {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      isPublic: playlist.isPublic,
    };
  }

  /** Saves a new track order. `trackIds` must be exactly the playlist's current tracks. */
  public static async reorderTracks(playlistId: string, userId: string, trackIds: string[]): Promise<void> {
    await this.getOwnedPlaylist(playlistId, userId);
    const current = await prisma.playlistTrack.findMany({ where: { playlistId }, select: { trackId: true } });
    const requested = new Set(trackIds);
    if (requested.size !== trackIds.length || requested.size !== current.length || current.some((t) => !requested.has(t.trackId))) {
      throw ApiError.conflict('The playlist changed while you were reordering it. Reload and try again.');
    }
    // One statement instead of a round trip per track. "spotifyTrackId" is
    // trackId's physical column name (see @map in schema.prisma).
    await prisma.$executeRaw`
      UPDATE "PlaylistTrack" AS pt SET "position" = o.ord - 1
      FROM unnest(${trackIds}::text[]) WITH ORDINALITY AS o(track_id, ord)
      WHERE pt."playlistId" = ${playlistId} AND pt."spotifyTrackId" = o.track_id`;
  }

  public static async removeTrackFromPlaylist(playlistId: string, trackId: string, userId: string): Promise<void> {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw ApiError.notFound(ERROR_MESSAGES.PLAYLIST_NOT_FOUND);
    }

    if (playlist.ownerId !== userId) {
      throw ApiError.forbidden(ERROR_MESSAGES.PLAYLIST_ACCESS_DENIED);
    }

    const existingTrack = await prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: { playlistId, trackId: trackId }
      }
    });

    if (!existingTrack) {
      throw ApiError.notFound(ERROR_MESSAGES.TRACK_NOT_IN_PLAYLIST);
    }

    await prisma.playlistTrack.delete({
      where: { id: existingTrack.id }
    });
  }

  public static async deletePlaylist(playlistId: string, userId: string): Promise<void> {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId }
    });

    if (!playlist) {
      throw ApiError.notFound(ERROR_MESSAGES.PLAYLIST_NOT_FOUND);
    }

    if (playlist.ownerId !== userId) {
      throw ApiError.forbidden(ERROR_MESSAGES.PLAYLIST_ACCESS_DENIED);
    }

    await prisma.playlist.delete({
      where: { id: playlistId }
    });
  }
}

