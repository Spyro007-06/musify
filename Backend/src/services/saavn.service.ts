import { SearchService, SongService, DiscoverService, ArtistService, AlbumService, PlaylistService } from 'jiosaavn-sdk';
import { logger } from '@utils/logger';
import { resilientCall } from '@utils/resilience';
import { SaavnUpstreamError } from '@utils/SaavnUpstreamError';
import { withCache } from '@utils/cache';
import { dedupeById } from '@utils/dedupe';

/**
 * Per-operation circuit breakers, so a burst of failures in one feature
 * (e.g. search) doesn't also fail-fast every other feature (track lookup,
 * artist pages, streaming) for the duration of that breaker's cooldown.
 * Cooldown/threshold config stays centralized in resilientCall/getBreaker
 * (resilience.ts) — only the breaker *name* (and therefore its state)
 * differs per call site here.
 */
const SAAVN_BREAKER = {
  SEARCH: 'jiosaavn:search', // searchSongs/Albums/Artists/Playlists — search, suggestions, genre/mood/vibe queries
  TRACK: 'jiosaavn:track', // getSongByIds — track lookup
  ARTIST: 'jiosaavn:artist', // getArtistById — artist profile, top tracks, albums, related artists
  STREAM: 'jiosaavn:stream', // the specific call backing playback — isolated from browsing a track's details
  CATALOG: 'jiosaavn:catalog', // charts, new releases, album lookup, playlist lookup
} as const;

/**
 * Runs a batch of independent Saavn calls in parallel. If at least one
 * succeeds, returns the successful results (a partial failure among many
 * queries shouldn't fail the whole request). Only throws — as a classified
 * upstream failure — when every call in the batch failed, since that's the
 * signal the upstream itself is down rather than "no results for this
 * particular sub-query".
 */
async function allOrThrow<T>(promises: Promise<T>[], errorMessage: string): Promise<Awaited<T>[]> {
  if (promises.length === 0) return [];
  const settled = await Promise.allSettled(promises);
  const fulfilled: Awaited<T>[] = [];
  let firstFailureReason: unknown;
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      fulfilled.push(result.value);
    } else if (firstFailureReason === undefined) {
      firstFailureReason = result.reason;
    }
  }
  if (fulfilled.length === 0) {
    throw new SaavnUpstreamError(errorMessage, firstFailureReason);
  }
  return fulfilled;
}

function unescapeHtml(str: string): string {
  // JioSaavn returns non-string values (arrays/objects) for some fields —
  // e.g. artist.bio — on a truthy-but-not-a-string input this used to throw
  // TypeError: str.replace is not a function, which got reported to users as
  // "Music catalog is temporarily unavailable" (see mapArtist below).
  if (!str || typeof str !== 'string') return '';
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

/**
 * JioSaavn's search results occasionally contain the exact same track twice
 * under different ids (seen live: three identical "Raga of Revenge /
 * Anirudh Ravichander / 2:11" rows for one search). Dedupe by id first (the
 * common case), then by a normalized title+artist+duration signature so a
 * different-id-but-identical-content duplicate doesn't slip through either.
 */
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
      tracks: item.songs ? dedupeById(item.songs.map((t: any) => this.mapTrack(t))) : []
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
      bio: typeof item.bio === 'string' && item.bio ? unescapeHtml(item.bio) : `Official profile of ${name} on Musify.`
    };
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  public async getTrendingTracks(languages?: string[], artists?: string[]): Promise<any[]> {
    const cacheKey = `saavn:trending:${(languages || []).sort().join(',')}:${(artists || []).sort().join(',')}`;
    return withCache(cacheKey, 300, () => this.getTrendingTracksUncached(languages, artists));
  }

  private async getTrendingTracksUncached(languages?: string[], artists?: string[]): Promise<any[]> {
    if ((languages && languages.length > 0) || (artists && artists.length > 0)) {
      const preferredLangsLower = (languages || []).map(l => l.toLowerCase());
      const artistQueries = (artists || []).slice(0, 3);
      const languageQueries = (languages || []).map(lang => `${lang} hits`).slice(0, 2);
      const queries = [...languageQueries, ...artistQueries];

      const searchPromises = queries.map(q =>
        resilientCall(SAAVN_BREAKER.SEARCH, () => this.searchService.searchSongs({ query: q, page: 0, limit: 50 }))
      );
      const results = await allOrThrow(searchPromises, 'JioSaavn search is currently unavailable.');

      const rawTracks: any[] = [];

        results.forEach(res => {
          if (res.results) {
            res.results.forEach((song: any) => {
              const mapped = this.mapTrack(song);
              if (mapped) rawTracks.push(mapped);
            });
          }
        });

        const tracks = dedupeById(rawTracks);

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

      // JioSaavn's own ranking for a given query is static — without this,
      // "trending" would show the exact same tracks in the exact same order
      // on every cache refresh, forever. Shuffled once per cache window
      // (see getTrendingTracks's withCache), not per request.
      return filteredTracks.sort(() => Math.random() - 0.5);
    }

    try {
      const charts = await resilientCall(SAAVN_BREAKER.CATALOG, () => this.discoverService.getCharts());
      if (charts && charts.length > 0) {
        const firstChart = charts[0];
        const playlist = await resilientCall(SAAVN_BREAKER.CATALOG, () =>
          this.playlistService.getPlaylistById({ id: firstChart.id, page: 0, limit: 20 })
        );
        if (playlist && playlist.songs) {
          return dedupeById(playlist.songs.map((s: any) => this.mapTrack(s))).sort(() => Math.random() - 0.5);
        }
      }
      return [];
    } catch (error) {
      logger.error('❌ JioSaavn failed to fetch trending tracks (charts):', error);
      throw new SaavnUpstreamError('JioSaavn is currently unavailable.', error);
    }
  }

  public async getNewReleases(languages?: string[], artists?: string[]): Promise<any[]> {
    const cacheKey = `saavn:new-releases:${(languages || []).sort().join(',')}:${(artists || []).sort().join(',')}`;
    return withCache(cacheKey, 600, () => this.getNewReleasesUncached(languages, artists));
  }

  private async getNewReleasesUncached(languages?: string[], artists?: string[]): Promise<any[]> {
    if ((languages && languages.length > 0) || (artists && artists.length > 0)) {
      const preferredLangsLower = (languages || []).map(l => l.toLowerCase());

      // The real new-releases chart already carries an accurate language tag
      // and genuine release recency, unlike a "<language> new release"
      // keyword search, which matches loosely and can surface years-old
      // catalog items under a section titled "fresh ... just dropped".
      // Artist filtering has no chart equivalent, so that case still falls
      // through to the keyword search below.
      if (languages && languages.length > 0 && (!artists || artists.length === 0)) {
        try {
          const chart = await resilientCall(SAAVN_BREAKER.CATALOG, () => this.discoverService.getNewReleases({ limit: 50 }));
          const chartAlbums = (chart || [])
            .map((a: any) => this.mapAlbum(a))
            .filter((album: any) => {
              if (!album) return false;
              const albumLang = (album.genre || '').toLowerCase();
              return preferredLangsLower.some(l => albumLang.includes(l) || l.includes(albumLang));
            });
          if (chartAlbums.length > 0) {
            return chartAlbums.sort((a: any, b: any) => (b.releaseYear || 0) - (a.releaseYear || 0));
          }
        } catch (error) {
          logger.error('Failed to fetch language-filtered new-releases chart — falling back to keyword search:', error);
        }
      }

      const artistQueries = (artists || []).slice(0, 3);
      // "<language> new release" is a weak query on JioSaavn's search and
      // mostly returns nothing — "<language> <current year>" reliably
      // surfaces albums actually released this year instead.
      const currentYear = new Date().getFullYear();
      const languageQueries = (languages || []).map(lang => `${lang} ${currentYear}`).slice(0, 2);
      const queries = [...languageQueries, ...artistQueries];

      const searchPromises = queries.map(q =>
        resilientCall(SAAVN_BREAKER.SEARCH, () => this.searchService.searchAlbums({ query: q, page: 0, limit: 30 }))
      );
      const results = await allOrThrow(searchPromises, 'JioSaavn search is currently unavailable.');

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

        // Keyword search has no notion of recency, so without sorting a
        // years-old album can outrank something that actually just
        // dropped — sort what "New Releases" shows to match what the
        // section title promises.
        filteredAlbums.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));

      return filteredAlbums;
    }

    try {
      const newReleases = await resilientCall(SAAVN_BREAKER.CATALOG, () => this.discoverService.getNewReleases());
      return newReleases && newReleases.length > 0 ? newReleases.map((a: any) => this.mapAlbum(a)).filter(Boolean) : [];
    } catch (error) {
      logger.error('❌ JioSaavn failed to fetch new releases:', error);
      throw new SaavnUpstreamError('JioSaavn is currently unavailable.', error);
    }
  }

  public async getRecommendedTracks(): Promise<any[]> {
    // Simply fetch trending tracks from the default charts as recommendations
    return this.getTrendingTracks();
  }

  public async getRecommendationsByGenres(genres: string[], limit = 20): Promise<any[]> {
    if (genres.length === 0) return [];
    try {
      // Search each genre independently rather than joining them into one
      // literal query string — "rock rap" as a single search term mostly
      // surfaces tracks literally titled "Rock Rap" instead of a blend of
      // rock and rap music. Cap to 3 genres per call (a user can favourite
      // far more) and interleave the per-genre results round-robin, so a
      // multi-genre pick returns a genuine mix rather than one genre's
      // results followed by another's.
      const queries = genres.slice(0, 3);
      const searchPromises = queries.map((genre) =>
        resilientCall(SAAVN_BREAKER.SEARCH, () => this.searchService.searchSongs({ query: genre, page: 0, limit }))
      );
      const results = await allOrThrow(searchPromises, 'JioSaavn search is currently unavailable.');
      const perGenreTracks = results.map((res) => (res.results || []).map((s: any) => this.mapTrack(s)));

      const interleaved: any[] = [];
      const maxLen = Math.max(0, ...perGenreTracks.map((t) => t.length));
      for (let i = 0; i < maxLen; i++) {
        for (const list of perGenreTracks) {
          if (list[i]) interleaved.push(list[i]);
        }
      }

      return dedupeById(interleaved)
        .sort(() => Math.random() - 0.5)
        .slice(0, limit);
    } catch (error) {
      logger.error('❌ JioSaavn recommendations by genres failed:', error);
      throw new SaavnUpstreamError('JioSaavn search is currently unavailable.', error);
    }
  }

  /** Genuinely not-found: call succeeded, no such track. Upstream failure: throws SaavnUpstreamError. */
  public async getTrack(id: string): Promise<any> {
    try {
      const songs = await resilientCall(SAAVN_BREAKER.TRACK, () => this.songService.getSongByIds({ songIds: id }));
      return songs && songs.length > 0 ? this.mapTrack(songs[0]) : null;
    } catch (error) {
      logger.error(`❌ JioSaavn getTrack failed for ID ${id}:`, error);
      throw new SaavnUpstreamError(`JioSaavn is currently unavailable (track ${id}).`, error);
    }
  }

  /** Same distinction as getTrack: only throws on a genuine upstream failure, not on missing ids. */
  public async getTracks(ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];
    try {
      const songIdsParam = ids.join(',');
      const songs = await resilientCall(SAAVN_BREAKER.TRACK, () => this.songService.getSongByIds({ songIds: songIdsParam }));
      if (!songs) return [];
      // Preserve input order
      const mapped = songs.map((s: any) => this.mapTrack(s)).filter(Boolean);
      return ids.map(id => mapped.find((t: any) => t && t.id === id)).filter(Boolean);
    } catch (error) {
      logger.error('❌ JioSaavn getTracks failed:', error);
      throw new SaavnUpstreamError('JioSaavn is currently unavailable.', error);
    }
  }

  /**
   * Serves playback specifically (GET /tracks/:id/stream) under its own
   * breaker, isolated from browsing a track's details (getTrack) — a
   * playback outage and a "view details" outage are different severities
   * and shouldn't trip each other's breaker.
   */
  public async getTrackForStream(id: string): Promise<any> {
    try {
      const songs = await resilientCall(SAAVN_BREAKER.STREAM, () => this.songService.getSongByIds({ songIds: id }));
      return songs && songs.length > 0 ? this.mapTrack(songs[0]) : null;
    } catch (error) {
      logger.error(`❌ JioSaavn getTrackForStream failed for ID ${id}:`, error);
      throw new SaavnUpstreamError(`JioSaavn streaming is currently unavailable (track ${id}).`, error);
    }
  }

  public async getAlbum(id: string): Promise<any> {
    try {
      const album = await resilientCall(SAAVN_BREAKER.CATALOG, () => this.albumService.getAlbumById(id));
      return this.mapAlbum(album);
    } catch (error) {
      logger.error(`❌ JioSaavn getAlbum failed for ID ${id}:`, error);
      throw new SaavnUpstreamError(`JioSaavn is currently unavailable (album ${id}).`, error);
    }
  }

  public async getArtist(id: string): Promise<any> {
    try {
      const artist = await resilientCall(SAAVN_BREAKER.ARTIST, () =>
        this.artistService.getArtistById({
          artistId: id,
          page: 0,
          songCount: 1,
          albumCount: 1,
          sortBy: 'popularity',
          sortOrder: 'desc'
        })
      );
      return this.mapArtist(artist);
    } catch (error) {
      logger.error(`❌ JioSaavn getArtist failed for ID ${id}:`, error);
      throw new SaavnUpstreamError(`JioSaavn is currently unavailable (artist ${id}).`, error);
    }
  }

  public async getArtistTopTracks(id: string): Promise<any[]> {
    try {
      const artist = await resilientCall(SAAVN_BREAKER.ARTIST, () =>
        this.artistService.getArtistById({
          artistId: id,
          page: 0,
          songCount: 20,
          albumCount: 1,
          sortBy: 'popularity',
          sortOrder: 'desc'
        })
      );
      return artist.topSongs ? dedupeById(artist.topSongs.map((s: any) => this.mapTrack(s))) : [];
    } catch (error) {
      logger.error(`❌ JioSaavn getArtistTopTracks failed for ID ${id}:`, error);
      throw new SaavnUpstreamError(`JioSaavn is currently unavailable (artist ${id}).`, error);
    }
  }

  public async getArtistAlbums(id: string): Promise<any[]> {
    try {
      const artist = await resilientCall(SAAVN_BREAKER.ARTIST, () =>
        this.artistService.getArtistById({
          artistId: id,
          page: 0,
          songCount: 1,
          albumCount: 15,
          sortBy: 'popularity',
          sortOrder: 'desc'
        })
      );
      return artist.topAlbums ? artist.topAlbums.map((a: any) => this.mapAlbum(a)).filter(Boolean) : [];
    } catch (error) {
      logger.error(`❌ JioSaavn getArtistAlbums failed for ID ${id}:`, error);
      throw new SaavnUpstreamError(`JioSaavn is currently unavailable (artist ${id}).`, error);
    }
  }

  public async getRelatedArtists(id: string): Promise<any[]> {
    try {
      const artist = await resilientCall(SAAVN_BREAKER.ARTIST, () =>
        this.artistService.getArtistById({
          artistId: id,
          page: 0,
          songCount: 1,
          albumCount: 1,
          sortBy: 'popularity',
          sortOrder: 'desc'
        })
      );
      return artist.similarArtists ? artist.similarArtists.map((a: any) => this.mapArtist(a)).filter(Boolean).slice(0, 5) : [];
    } catch (error) {
      logger.error(`❌ JioSaavn getRelatedArtists failed for ID ${id}:`, error);
      throw new SaavnUpstreamError(`JioSaavn is currently unavailable (artist ${id}).`, error);
    }
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
      const searchPlaylists = await resilientCall(SAAVN_BREAKER.SEARCH, () =>
        this.searchService.searchPlaylists({ query: moodId, page: 0, limit: 5 })
      );
      return searchPlaylists.results
        ? searchPlaylists.results.map((p: any) => ({
            id: p.id,
            title: unescapeHtml(p.name || ''),
            description: unescapeHtml(p.subtitle || p.description || `${moodId} playlist`),
            cover: p.image?.[p.image.length - 1]?.url || null,
            tracksCount: p.songCount ? Number(p.songCount) : 10,
            owner: 'JioSaavn',
            isPublic: true
          }))
        : [];
    } catch (error) {
      logger.error(`❌ JioSaavn getMoodPlaylists failed for ${moodId}:`, error);
      throw new SaavnUpstreamError('JioSaavn search is currently unavailable.', error);
    }
  }

  public async search(query: string): Promise<any> {
    if (!query.trim()) {
      return { tracks: [], albums: [], artists: [], playlists: [] };
    }

    const [tracksRes, albumsRes, artistsRes, playlistsRes] = await Promise.allSettled([
      resilientCall(SAAVN_BREAKER.SEARCH, () => this.searchService.searchSongs({ query, page: 0, limit: 10 })),
      resilientCall(SAAVN_BREAKER.SEARCH, () => this.searchService.searchAlbums({ query, page: 0, limit: 10 })),
      resilientCall(SAAVN_BREAKER.SEARCH, () => this.searchService.searchArtists({ query, page: 0, limit: 10 })),
      resilientCall(SAAVN_BREAKER.SEARCH, () => this.searchService.searchPlaylists({ query, page: 0, limit: 10 })),
    ]);

    if ([tracksRes, albumsRes, artistsRes, playlistsRes].every((r) => r.status === 'rejected')) {
      logger.error(`❌ JioSaavn search failed for query "${query}": all categories failed`);
      throw new SaavnUpstreamError('JioSaavn search is currently unavailable.', (tracksRes as PromiseRejectedResult).reason);
    }

    const value = <T,>(r: PromiseSettledResult<T>): T | undefined => (r.status === 'fulfilled' ? r.value : undefined);

    return {
      tracks: dedupeById(value(tracksRes)?.results?.map((t: any) => this.mapTrack(t)) || []),
      albums: dedupeById(value(albumsRes)?.results?.map((a: any) => this.mapAlbum(a)) || []),
      artists: dedupeById(value(artistsRes)?.results?.map((a: any) => this.mapArtist(a)) || []),
      playlists: dedupeById(value(playlistsRes)?.results?.map((p: any) => ({
        id: p.id,
        title: unescapeHtml(p.name || ''),
        description: unescapeHtml(p.subtitle || p.description || ''),
        cover: p.image?.[p.image.length - 1]?.url || null,
        tracksCount: p.songCount ? Number(p.songCount) : 0,
        owner: 'JioSaavn',
        isPublic: true
      })) || [])
    };
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
        resilientCall(SAAVN_BREAKER.SEARCH, () => this.searchService.searchSongs({ query: q, page: 0, limit: 50 }))
      );
      const results = await allOrThrow(searchPromises, 'JioSaavn search is currently unavailable.');

      const rawTracks: any[] = [];

      results.forEach(res => {
        if (res.results) {
          res.results.forEach((item: any) => {
            const track = this.mapTrack(item);
            if (track) rawTracks.push(track);
          });
        }
      });

      const tracks = dedupeById(rawTracks);

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
      if (error instanceof SaavnUpstreamError) throw error;
      throw new SaavnUpstreamError('JioSaavn search is currently unavailable.', error);
    }
  }

  public async getSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];
    try {
      const results = await resilientCall(SAAVN_BREAKER.SEARCH, () => this.searchService.searchSongs({ query, page: 0, limit: 5 }));
      const names = results.results?.map((t: any) => unescapeHtml(t.name)) || [];
      return Array.from(new Set(names));
    } catch (error) {
      logger.error(`❌ JioSaavn getSuggestions failed for "${query}":`, error);
      throw new SaavnUpstreamError('JioSaavn search is currently unavailable.', error);
    }
  }
}
