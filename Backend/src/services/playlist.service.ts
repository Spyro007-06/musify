import { prisma } from '@config/database';
import { SaavnService } from './saavn.service';
import { MusicService } from './music.service';
import { ApiError } from '@utils/ApiError';
import { ERROR_MESSAGES } from '@constants/messages';
import { uniqueSlug } from '@utils/slugify';

export class PlaylistService {
  private static saavn = SaavnService.getInstance();

  public static async getPlaylists(userId: string): Promise<any[]> {
    const playlists = await prisma.playlist.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { isPublic: true }
        ]
      },
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

    // Fetch user's liked tracks, recently played tracks, and custom playlist tracks in parallel
    const [likedTracks, recentlyPlayed, playlistTracks] = await Promise.all([
      prisma.likedTrack.findMany({
        where: { userId },
        select: { spotifyTrackId: true }
      }),
      prisma.listeningHistory.findMany({
        where: { userId },
        select: { spotifyTrackId: true }
      }),
      prisma.playlistTrack.findMany({
        where: { playlist: { ownerId: userId } },
        select: { spotifyTrackId: true }
      })
    ]);

    const trackIds = Array.from(new Set([
      ...likedTracks.map((t: any) => t.spotifyTrackId),
      ...recentlyPlayed.map((t: any) => t.spotifyTrackId),
      ...playlistTracks.map((t: any) => t.spotifyTrackId)
    ]));

    const moviePlaylistsMap = new Map<string, any>();

    if (trackIds.length > 0) {
      try {
        const tracks = await this.saavn.getTracks(trackIds);
        for (const track of tracks) {
          if (track && track.album && track.album.id) {
            const albumId = track.album.id;
            if (!moviePlaylistsMap.has(albumId)) {
              moviePlaylistsMap.set(albumId, {
                id: `movie-${albumId}`,
                title: track.album.title,
                description: `Soundtrack from the movie ${track.album.title}.`,
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

    const moviePlaylists = Array.from(moviePlaylistsMap.values()).map(p => {
      const { trackIdsSet, ...rest } = p;
      return {
        ...rest,
        tracksCount: trackIdsSet.size
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
        description: `Soundtrack from the movie ${album.title}.`,
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
          select: { spotifyTrackId: true, addedAt: true },
          orderBy: { addedAt: 'asc' }
        }
      }
    });

    if (!playlist) {
      throw ApiError.notFound(ERROR_MESSAGES.PLAYLIST_NOT_FOUND);
    }

    if (!playlist.isPublic && playlist.ownerId !== userId) {
      throw ApiError.forbidden(ERROR_MESSAGES.PLAYLIST_ACCESS_DENIED);
    }

    const trackIds = playlist.tracks.map((t: any) => t.spotifyTrackId);
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
      description = `Soundtrack from the movie ${album.title}.`;
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
          create: trackIds.map(id => ({
            spotifyTrackId: id
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
        playlistId_spotifyTrackId: { playlistId, spotifyTrackId: trackId }
      }
    });

    if (existingTrack) {
      throw ApiError.conflict(ERROR_MESSAGES.TRACK_ALREADY_IN_PLAYLIST);
    }

    await prisma.playlistTrack.create({
      data: {
        playlistId,
        spotifyTrackId: trackId,
      }
    });
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
        playlistId_spotifyTrackId: { playlistId, spotifyTrackId: trackId }
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

