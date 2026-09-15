import { SearchService, SongService, DiscoverService, ArtistService, AlbumService, PlaylistService } from 'jiosaavn-sdk';
import { logger } from '@utils/logger';

function unescapeHtml(str: string): string {
  if (!str) return str;
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&middot;/g, '·')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

export class SaavnService {
  private static instance: SaavnService;
  private searchService = new SearchService();
  private songService = new SongService();
  private discoverService = new DiscoverService();
  private artistService = new ArtistService();
  private albumService = new AlbumService();
  private playlistService = new PlaylistService();

  private constructor() {
    logger.info('🎶 JioSaavn API Service initialized (zero configuration required)');
  }

  public static getInstance(): SaavnService {
    if (!SaavnService.instance) {
      SaavnService.instance = new SaavnService();
    }
    return SaavnService.instance;
  }

  // ─── Mappings ─────────────────────────────────────────────────────────────

  private mapTrack(item: any) {
    if (!item) return null;
    const artwork = item.image?.[item.image.length - 1]?.url || item.image?.[item.image.length - 1]?.link || null;
    const audioUrl = item.downloadUrl?.[item.downloadUrl.length - 1]?.url || item.downloadUrl?.[item.downloadUrl.length - 1]?.link || null;
    
    // Normalize artists structure
    let trackArtists: any[] = [];
    if (item.artists?.primary) {
      trackArtists = item.artists.primary.map((a: any) => ({ id: a.id, name: unescapeHtml(a.name) }));
    } else if (item.artists?.all) {
      trackArtists = item.artists.all.filter((a: any) => a.role === 'primary_artists' || a.role === 'singer').map((a: any) => ({ id: a.id, name: unescapeHtml(a.name) }));
    } else if (typeof item.primaryArtists === 'string') {
      trackArtists = item.primaryArtists.split(',').map((name: string) => ({
        id: name.trim().toLowerCase().replace(/\s+/g, '-'),
        name: unescapeHtml(name.trim())
      }));
    }

    if (trackArtists.length === 0) {
      trackArtists = [{ id: 'unknown-artist', name: 'Unknown Artist' }];
    }

    return {
      id: item.id,
      title: unescapeHtml(item.name || item.title),
      duration: item.duration ? Math.round(Number(item.duration)) : 180,
      artwork,
      audioUrl,
      artists: trackArtists,
      album: item.album ? {
        id: item.album.id,
        title: unescapeHtml(item.album.name || item.album.title || ''),
        artwork,
        releaseYear: item.year ? parseInt(String(item.year), 10) : undefined,
        type: 'album',
      } : undefined,
      playCount: item.playCount ? Number(item.playCount) : 0,
      genre: item.language || undefined
    };
  }

  private mapAlbum(item: any) {
    if (!item) return null;
    // JioSaavn returns images in different formats depending on the endpoint
    let artwork: string | null = null;
    if (Array.isArray(item.image) && item.image.length > 0) {
      artwork = item.image[item.image.length - 1]?.url || item.image[item.image.length - 1]?.link || null;
    } else if (typeof item.image === 'string' && item.image) {
      artwork = item.image;
    }
    // Force 500x500 resolution if we got a URL
    if (artwork) {
      artwork = artwork.replace(/50x50|150x150/g, '500x500');
    }
    
    let albumArtist = { id: 'various-artists', name: 'Various Artists' };
    if (item.artists?.primary?.[0]) {
      albumArtist = { id: item.artists.primary[0].id, name: unescapeHtml(item.artists.primary[0].name) };
    } else if (item.artists?.[0]) {
      albumArtist = { id: item.artists[0].id, name: unescapeHtml(item.artists[0].name) };
    }

    return {
      id: item.id,
      title: unescapeHtml(item.name || item.title),
      artist: albumArtist,
      artwork,
      releaseYear: item.year ? parseInt(String(item.year), 10) : undefined,
      tracksCount: item.songCount ? Number(item.songCount) : 0,
      type: item.type || 'album',
      genre: item.language || undefined,
      tracks: item.songs?.map((t: any) => this.mapTrack(t)).filter(Boolean) || []
    };
  }

  private mapArtist(item: any) {
    if (!item) return null;
    const image = item.image?.[item.image.length - 1]?.url || item.image?.[item.image.length - 1]?.link || null;
    
    // Parse followers count
    let followers = 0;
    if (item.followerCount) followers = parseInt(String(item.followerCount), 10);
    else if (item.fanCount) followers = parseInt(String(item.fanCount), 10);

    const name = unescapeHtml(item.name || '');

    return {
      id: item.id,
      name,
      image,
      followers: isNaN(followers) ? 0 : followers,
      isVerified: item.isVerified || false,
      genres: item.dominantLanguage ? [item.dominantLanguage] : [],
      bio: item.bio ? unescapeHtml(item.bio) : `Official profile of ${name} on Musify.`
    };
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  public async getTrendingTracks(languages?: string[], artists?: string[]): Promise<any[]> {
    try {
      if ((languages && languages.length > 0) || (artists && artists.length > 0)) {
        const preferredLangsLower = (languages || []).map(l => l.toLowerCase());
        const artistQueries = (artists || []).slice(0, 3);
        const languageQueries = (languages || []).map(lang => `${lang} hits`).slice(0, 2);
        const queries = [...languageQueries, ...artistQueries];
        
        const searchPromises = queries.map(q => 
          this.searchService.searchSongs({ query: q, page: 0, limit: 50 })
        );
        const results = await Promise.all(searchPromises);
        
        const tracks: any[] = [];
        const seen = new Set<string>();
        
        results.forEach(res => {
          if (res.results) {
            res.results.forEach((song: any) => {
              const mapped = this.mapTrack(song);
              if (mapped && !seen.has(mapped.id)) {
                seen.add(mapped.id);
                tracks.push(mapped);
              }
            });
          }
        });

        // Strict Filter: Must match selected languages and selected artists
        const filteredTracks = tracks.filter(track => {
          if (!track) return false;
          if (languages && languages.length > 0) {
            const trackLang = (track.genre || '').toLowerCase();
            if (!preferredLangsLower.some(l => trackLang.includes(l) || l.includes(trackLang))) {
              return false;
            }
          }
          if (artists && artists.length > 0) {
            const preferredArtistsLower = artists.map(a => a.toLowerCase());
            const trackArtists = (track.artists || []).map((a: any) => a.name.toLowerCase());
            if (!trackArtists.some((name: string) => 
              preferredArtistsLower.some(pref => name.includes(pref) || pref.includes(name))
            )) {
              return false;
            }
          }
          return true;
        });

        return filteredTracks;
      }

      const charts = await this.discoverService.getCharts();
      if (charts && charts.length > 0) {
        const firstChart = charts[0];
        const playlist = await this.playlistService.getPlaylistById({ id: firstChart.id, page: 0, limit: 20 });
        if (playlist && playlist.songs) {
          return playlist.songs.map((s: any) => this.mapTrack(s)).filter(Boolean);
        }
      }
    } catch (error) {
      logger.error('❌ JioSaavn failed to fetch trending tracks, using empty fallback:', error);
    }
    return [];
  }

  public async getNewReleases(languages?: string[], artists?: string[]): Promise<any[]> {
    try {
      if ((languages && languages.length > 0) || (artists && artists.length > 0)) {
        const preferredLangsLower = (languages || []).map(l => l.toLowerCase());
        const artistQueries = (artists || []).slice(0, 3);
        const languageQueries = (languages || []).map(lang => `${lang} new release`).slice(0, 2);
        const queries = [...languageQueries, ...artistQueries];

        const searchPromises = queries.map(q =>
          this.searchService.searchAlbums({ query: q, page: 0, limit: 30 })
        );
        const results = await Promise.all(searchPromises);

        const albums: any[] = [];
        const seen = new Set<string>();

        results.forEach(res => {
          if (res.results) {
            res.results.forEach((alb: any) => {
              const mapped = this.mapAlbum(alb);
              if (mapped && !seen.has(mapped.id)) {
                seen.add(mapped.id);
                albums.push(mapped);
              }
            });
          }
        });

        // Strict Filter: Must match selected languages and selected artists
        const filteredAlbums = albums.filter(album => {
          if (!album) return false;
          if (languages && languages.length > 0) {
            const albumLang = (album.genre || '').toLowerCase();
            if (!preferredLangsLower.some(l => albumLang.includes(l) || l.includes(albumLang))) {
              return false;
            }
          }
          if (artists && artists.length > 0) {
            const preferredArtistsLower = artists.map(a => a.toLowerCase());
            const albumArtist = (album.artist?.name || '').toLowerCase();
            const albumTracksArtists = (album.tracks || []).flatMap((t: any) => (t.artists || []).map((a: any) => a.name.toLowerCase()));
            const allArtists = [albumArtist, ...albumTracksArtists];

            if (!allArtists.some((name: string) => 
              preferredArtistsLower.some(pref => name.includes(pref) || pref.includes(name))
            )) {
              return false;
            }
          }
          return true;
        });

        return filteredAlbums;
      }

      const newReleases = await this.discoverService.getNewReleases();
      if (newReleases && newReleases.length > 0) {
        return newReleases.map((a: any) => this.mapAlbum(a)).filter(Boolean);
      }
    } catch (error) {
      logger.error('❌ JioSaavn failed to fetch new releases:', error);
    }
    return [];
  }

  public async getRecommendedTracks(): Promise<any[]> {
    // Simply fetch trending tracks from the default charts as recommendations
    return this.getTrendingTracks();
  }

  public async getRecommendationsByGenres(genres: string[], limit = 20): Promise<any[]> {
    try {
      const query = genres.join(' ');
      const results = await this.searchService.searchSongs({ query, page: 0, limit });
      if (results.results) {
        return results.results.map((s: any) => this.mapTrack(s)).filter(Boolean);
      }
    } catch (error) {
      logger.error('❌ JioSaavn recommendations by genres failed:', error);
    }
    return [];
  }

  public async getTrack(id: string): Promise<any> {
    try {
      const songs = await this.songService.getSongByIds({ songIds: id });
      if (songs && songs.length > 0) {
        return this.mapTrack(songs[0]);
      }
    } catch (error) {
      logger.error(`❌ JioSaavn getTrack failed for ID ${id}:`, error);
    }
    return null;
  }

  public async getTracks(ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];
    try {
      const songIdsParam = ids.join(',');
      const songs = await this.songService.getSongByIds({ songIds: songIdsParam });
      if (songs) {
        // Preserve input order
        const mapped = songs.map((s: any) => this.mapTrack(s)).filter(Boolean);
        return ids.map(id => mapped.find((t: any) => t && t.id === id)).filter(Boolean);
      }
    } catch (error) {
      logger.error('❌ JioSaavn getTracks failed:', error);
    }
    return [];
  }

  public async getAlbum(id: string): Promise<any> {
    try {
      const album = await this.albumService.getAlbumById(id);
      return this.mapAlbum(album);
    } catch (error) {
      logger.error(`❌ JioSaavn getAlbum failed for ID ${id}:`, error);
    }
    return null;
  }

  public async getArtist(id: string): Promise<any> {
    try {
      const artist = await this.artistService.getArtistById({
        artistId: id,
        page: 0,
        songCount: 1,
        albumCount: 1,
        sortBy: 'popularity',
        sortOrder: 'desc'
      });
      return this.mapArtist(artist);
    } catch (error) {
      logger.error(`❌ JioSaavn getArtist failed for ID ${id}:`, error);
    }
    return null;
  }

  public async getArtistTopTracks(id: string): Promise<any[]> {
    try {
      const artist = await this.artistService.getArtistById({
        artistId: id,
        page: 0,
        songCount: 20,
        albumCount: 1,
        sortBy: 'popularity',
        sortOrder: 'desc'
      });
      if (artist.topSongs) {
        return artist.topSongs.map((s: any) => this.mapTrack(s)).filter(Boolean);
      }
    } catch (error) {
      logger.error(`❌ JioSaavn getArtistTopTracks failed for ID ${id}:`, error);
    }
    return [];
  }

  public async getArtistAlbums(id: string): Promise<any[]> {
    try {
      const artist = await this.artistService.getArtistById({
        artistId: id,
        page: 0,
        songCount: 1,
        albumCount: 15,
        sortBy: 'popularity',
        sortOrder: 'desc'
      });
      if (artist.topAlbums) {
        return artist.topAlbums.map((a: any) => this.mapAlbum(a)).filter(Boolean);
      }
    } catch (error) {
      logger.error(`❌ JioSaavn getArtistAlbums failed for ID ${id}:`, error);
    }
    return [];
  }

  public async getRelatedArtists(id: string): Promise<any[]> {
    try {
      const artist = await this.artistService.getArtistById({
        artistId: id,
        page: 0,
        songCount: 1,
        albumCount: 1,
        sortBy: 'popularity',
        sortOrder: 'desc'
      });
      if (artist.similarArtists) {
        return artist.similarArtists.map((a: any) => this.mapArtist(a)).filter(Boolean).slice(0, 5);
      }
    } catch (error) {
      logger.error(`❌ JioSaavn getRelatedArtists failed for ID ${id}:`, error);
    }
    return [];
  }

  public async getCategories(): Promise<any[]> {
    // Return standard categories with pleasant gradients
    return [
      { id: 'hindi', name: 'Hindi Hits', cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80', gradient: 'from-[#4720ca] to-[#0b0b0f]' },
      { id: 'punjabi', name: 'Punjabi Beats', cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80', gradient: 'from-[#1ed760] to-[#0b0b0f]' },
      { id: 'tamil', name: 'Tamil Melodies', cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80', gradient: 'from-[#ff6584] to-[#0b0b0f]' },
      { id: 'english', name: 'International Pop', cover: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=400&q=80', gradient: 'from-[#8cbeff] to-[#0b0b0f]' }
    ];
  }

  public async getMoodPlaylists(moodId: string): Promise<any[]> {
    try {
      // Find charts or playlists related to this mood
      const searchPlaylists = await this.searchService.searchPlaylists({ query: moodId, page: 0, limit: 5 });
      if (searchPlaylists.results) {
        return searchPlaylists.results.map((p: any) => ({
          id: p.id,
          title: unescapeHtml(p.name || ''),
          description: unescapeHtml(p.subtitle || p.description || `${moodId} playlist`),
          cover: p.image?.[p.image.length - 1]?.url || null,
          tracksCount: p.songCount ? Number(p.songCount) : 10,
          owner: 'JioSaavn',
          isPublic: true
        }));
      }
    } catch (error) {
      logger.error(`❌ JioSaavn getMoodPlaylists failed for ${moodId}:`, error);
    }
    return [];
  }

  public async search(query: string): Promise<any> {
    if (!query.trim()) {
      return { tracks: [], albums: [], artists: [], playlists: [] };
    }

    try {
      const [tracksRes, albumsRes, artistsRes, playlistsRes] = await Promise.all([
        this.searchService.searchSongs({ query, page: 0, limit: 10 }),
        this.searchService.searchAlbums({ query, page: 0, limit: 10 }),
        this.searchService.searchArtists({ query, page: 0, limit: 10 }),
        this.searchService.searchPlaylists({ query, page: 0, limit: 10 })
      ]);

      return {
        tracks: tracksRes.results?.map((t: any) => this.mapTrack(t)).filter(Boolean) || [],
        albums: albumsRes.results?.map((a: any) => this.mapAlbum(a)).filter(Boolean) || [],
        artists: artistsRes.results?.map((a: any) => this.mapArtist(a)).filter(Boolean) || [],
        playlists: playlistsRes.results?.map((p: any) => ({
          id: p.id,
          title: unescapeHtml(p.name || ''),
          description: unescapeHtml(p.subtitle || p.description || ''),
          cover: p.image?.[p.image.length - 1]?.url || null,
          tracksCount: p.songCount ? Number(p.songCount) : 0,
          owner: 'JioSaavn',
          isPublic: true
        })).filter(Boolean) || []
      };
    } catch (error) {
      logger.error(`❌ JioSaavn search failed for query "${query}":`, error);
    }

    return { tracks: [], albums: [], artists: [], playlists: [] };
  }

  public async getRecommendations(languages: string[], artists: string[], limit = 20): Promise<any[]> {
    try {
      const preferredLangsLower = languages.map(l => l.toLowerCase());
      const artistQueries = artists.slice(0, 3);
      const languageQueries = languages.map(lang => `${lang} hits`).slice(0, 2);
      const searchQueries = [...languageQueries, ...artistQueries];

      if (searchQueries.length === 0) {
        searchQueries.push('hits');
      }

      const searchPromises = searchQueries.map(q =>
        this.searchService.searchSongs({ query: q, page: 0, limit: 50 })
      );
      const results = await Promise.all(searchPromises);

      const tracks: any[] = [];
      const seen = new Set<string>();

      results.forEach(res => {
        if (res.results) {
          res.results.forEach((item: any) => {
            const track = this.mapTrack(item);
            if (track && !seen.has(track.id)) {
              seen.add(track.id);
              tracks.push(track);
            }
          });
        }
      });

      // Strict Filter: Must match selected languages and selected artists
      const filteredTracks = tracks.filter(track => {
        if (!track) return false;
        if (languages && languages.length > 0) {
          const trackLang = (track.genre || '').toLowerCase();
          if (!preferredLangsLower.some(l => trackLang.includes(l) || l.includes(trackLang))) {
            return false;
          }
        }
        if (artists && artists.length > 0) {
          const preferredArtistsLower = artists.map(a => a.toLowerCase());
          const trackArtists = (track.artists || []).map((a: any) => a.name.toLowerCase());
          if (!trackArtists.some((name: string) => 
            preferredArtistsLower.some(pref => name.includes(pref) || pref.includes(name))
          )) {
            return false;
          }
        }
        return true;
      });

      const shuffledTracks = filteredTracks.sort(() => Math.random() - 0.5);
      return shuffledTracks.slice(0, limit);
    } catch (error) {
      logger.error('❌ JioSaavn getRecommendations failed:', error);
    }
    return [];
  }

  public async getSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];
    try {
      const results = await this.searchService.searchSongs({ query, page: 0, limit: 5 });
      return results.results?.map((t: any) => t.name) || [];
    } catch (error) {
      logger.error(`❌ JioSaavn getSuggestions failed for "${query}":`, error);
    }
    return [];
  }
}
