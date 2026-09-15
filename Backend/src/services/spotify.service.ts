import { env } from '@config/env';
import { logger } from '@utils/logger';

// Mock Data fallbacks in case Spotify credentials are not configured
const MOCK_ARTISTS = [
  { id: 'art-1', name: 'Ethereal State', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80', followers: 120500, isVerified: true, genres: ['Ambient', 'Electronic'], bio: 'Immersive soundscapes from the future.' },
  { id: 'art-2', name: 'The Synthesis', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', followers: 85200, isVerified: true, genres: ['Synthwave', 'Retro'], bio: 'Analog vibes for digital minds.' },
  { id: 'art-3', name: 'Circuit Break', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', followers: 243000, isVerified: false, genres: ['Techno', 'Industrial'], bio: 'Hard-hitting beats and mechanical rhythms.' },
  { id: 'art-4', name: 'Vista', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', followers: 64000, isVerified: true, genres: ['Chillout', 'Lofi'], bio: 'Relaxing sounds for deep study and sleep.' },
  { id: 'art-5', name: 'Dust & Groove', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', followers: 154000, isVerified: true, genres: ['Jazz', 'Hip Hop'], bio: 'Dusty samples and groovy basslines.' },
  { id: 'art-6', name: 'Matrix Theory', image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&q=80', followers: 45000, isVerified: false, genres: ['Cyberpunk', 'EDM'], bio: 'High energy electronic music.' },
  { id: 'art-7', name: 'Solaris', image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80', followers: 310000, isVerified: true, genres: ['Trance', 'Progressive'], bio: 'Uplifting and emotional melodies.' },
  { id: 'art-10', name: 'Astra', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', followers: 98000, isVerified: true, genres: ['Dream Pop', 'Shoegaze'], bio: 'Ethereal vocals and wall of guitars.' }
];

const MOCK_TRACKS = [
  { id: 'rec-1', title: 'Midnight Echo', duration: 225, artwork: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', artists: [MOCK_ARTISTS[0]], playCount: 45000, genre: 'Ambient' },
  { id: 'rec-2', title: 'Prism Drift', duration: 184, artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', artists: [MOCK_ARTISTS[1]], playCount: 38200, genre: 'Synthwave' },
  { id: 'rec-3', title: 'Vector Pulse', duration: 210, artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', artists: [MOCK_ARTISTS[2]], playCount: 89000, genre: 'Techno' },
  { id: 'rec-4', title: 'Horizon Zero', duration: 260, artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', artists: [MOCK_ARTISTS[3]], playCount: 22100, genre: 'Chillout' },
  { id: 'rec-5', title: 'Analog Dream', duration: 195, artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', artists: [MOCK_ARTISTS[4]], playCount: 54100, genre: 'Jazz' },
  { id: 'hero-1', title: 'Starlight', duration: 225, artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', artists: [MOCK_ARTISTS[7]], playCount: 125000, genre: 'Dream Pop' }
];

const MOCK_ALBUMS = [
  { id: 'alb-1', title: 'Digital Soul', artwork: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&q=80', tracksCount: 12, artist: MOCK_ARTISTS[5], releaseYear: 2024, type: 'album', genre: 'Cyberpunk', tracks: [MOCK_TRACKS[0], MOCK_TRACKS[1]] },
  { id: 'alb-2', title: 'Oasis Redux', artwork: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80', tracksCount: 1, artist: MOCK_ARTISTS[6], releaseYear: 2023, type: 'single', genre: 'Trance', tracks: [MOCK_TRACKS[4]] },
  { id: 'alb-3', title: 'Neon Nights', artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80', tracksCount: 6, artist: MOCK_ARTISTS[1], releaseYear: 2024, type: 'ep', genre: 'Synthwave', tracks: [MOCK_TRACKS[1], MOCK_TRACKS[2]] }
];

const MOCK_CATEGORIES = [
  { id: 'focus', name: 'Deep Focus', cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80', gradient: 'from-[#4720ca] to-[#0b0b0f]' },
  { id: 'energy', name: 'Energy Boost', cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80', gradient: 'from-[#1ed760] to-[#0b0b0f]' },
  { id: 'chill', name: 'Chill Vibes', cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80', gradient: 'from-[#ff6584] to-[#0b0b0f]' },
  { id: 'melancholy', name: 'Midnight Melancholy', cover: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=400&q=80', gradient: 'from-[#8cbeff] to-[#0b0b0f]' }
];

export class SpotifyService {
  private static instance: SpotifyService;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private isSpotifyConfigured: boolean = false;

  private constructor() {
    this.isSpotifyConfigured = !!(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
    if (!this.isSpotifyConfigured) {
      logger.warn('⚠️ Spotify client credentials not configured. Backend will operate in MOCK FALLBACK mode.');
    }
  }

  public static getInstance(): SpotifyService {
    if (!SpotifyService.instance) {
      SpotifyService.instance = new SpotifyService();
    }
    return SpotifyService.instance;
  }

  /**
   * Refreshes the Client Credentials Access Token from Spotify
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.isSpotifyConfigured) return;
    try {
      const authHeader = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`Spotify auth token endpoint returned status ${response.status}`);
      }

      const data = await response.json() as { access_token: string; expires_in: number };
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
      logger.info('🔄 Refreshed Spotify Access Token');
    } catch (error) {
      logger.error('❌ Failed to refresh Spotify Access Token:', error);
      throw error;
    }
  }

  /**
   * Gets the cached access token, refreshing if necessary
   */
  private async getAccessToken(): Promise<string | null> {
    if (!this.isSpotifyConfigured) return null;
    const now = Date.now();
    if (!this.accessToken || this.tokenExpiresAt <= now + 60000) {
      await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  /**
   * Makes a request to the Spotify API
   */
  private async fetchSpotify(endpoint: string): Promise<any> {
    const token = await this.getAccessToken();
    if (!token) return null;

    const url = `https://api.spotify.com/v1${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired unexpectedly, clear and retry once
          this.accessToken = null;
          return this.fetchSpotify(endpoint);
        }
        logger.error(`Spotify API error for ${endpoint} with status ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error(`❌ Spotify API request error on ${endpoint}:`, error);
      return null;
    }
  }

  // ─── Mappings ─────────────────────────────────────────────────────────────

  private mapTrack(item: any) {
    if (!item) return null;
    const artwork = item.album?.images?.[0]?.url || item.artwork || null;
    return {
      id: item.id,
      title: item.name || item.title,
      duration: item.duration_ms ? Math.round(item.duration_ms / 1000) : item.duration || 180,
      artwork,
      audioUrl: item.preview_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      artists: item.artists?.map((a: any) => ({
        id: a.id,
        name: a.name,
      })) || [],
      album: item.album ? {
        id: item.album.id,
        title: item.album.name,
        artwork,
        releaseYear: item.album.release_date ? parseInt(item.album.release_date.substring(0, 4), 10) : undefined,
        type: item.album.album_type,
      } : undefined,
      playCount: item.popularity ? item.popularity * 1000 : item.playCount || 0,
      genre: item.genre || undefined
    };
  }

  private mapAlbum(item: any) {
    if (!item) return null;
    return {
      id: item.id,
      title: item.name || item.title,
      artist: item.artists?.[0] ? { id: item.artists[0].id, name: item.artists[0].name } : item.artist || { id: 'unknown', name: 'Unknown Artist' },
      artwork: item.images?.[0]?.url || item.artwork || null,
      releaseYear: item.release_date ? parseInt(item.release_date.substring(0, 4), 10) : item.releaseYear || undefined,
      tracksCount: item.total_tracks || item.tracksCount || 0,
      type: item.album_type || item.type || 'album',
      genre: item.genres?.[0] || item.genre || undefined,
      tracks: item.tracks?.items?.map((t: any) => {
        // Inherit album details on track
        return this.mapTrack({ ...t, album: item });
      }) || item.tracks || []
    };
  }

  private mapArtist(item: any) {
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      image: item.images?.[0]?.url || item.image || null,
      followers: item.followers?.total || item.followers || 0,
      isVerified: item.popularity > 60 || item.isVerified || false,
      genres: item.genres || [],
      bio: item.bio || `Official profile of ${item.name} on Vibe.`
    };
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  public async getTrendingTracks(languages?: string[], artists?: string[]): Promise<any[]> {
    if (!this.isSpotifyConfigured) return MOCK_TRACKS;

    if ((languages && languages.length > 0) || (artists && artists.length > 0)) {
      const queries: string[] = [];
      if (artists && artists.length > 0) {
        const artistQuery = artists.map(art => `artist:"${art}"`).join(' OR ');
        queries.push(artistQuery);
      }
      if (languages && languages.length > 0) {
        languages.forEach(lang => {
          if (lang === 'hindi') queries.push('bollywood hits 2026');
          else if (lang === 'tamil') queries.push('tamil hits 2026');
          else if (lang === 'telugu') queries.push('telugu hits 2026');
          else if (lang === 'punjabi') queries.push('punjabi hits 2026');
          else if (lang === 'spanish') queries.push('latin hits 2026');
          else if (lang === 'korean') queries.push('k-pop hits 2026');
          else if (lang === 'english') queries.push('pop hits 2026');
        });
      }
      
      const query = queries.join(' OR ');
      const result = await this.fetchSpotify(`/search?q=${encodeURIComponent(query)}&type=track&limit=15`);
      if (result && result.tracks && result.tracks.items && result.tracks.items.length > 0) {
        return result.tracks.items
          .filter(Boolean)
          .map((t: any) => this.mapTrack(t))
          .filter((t: any) => t !== null);
      }
    }

    // Default global trending
    const result = await this.fetchSpotify('/playlists/37i9dQZF1DXcBWIGmq7BmE/tracks?limit=10');
    if (result && result.items && result.items.length > 0) {
      return result.items
        .map((item: any) => this.mapTrack(item.track))
        .filter((t: any) => t !== null);
    }

    // Fallback to search if the playlist is restricted (403)
    logger.info('⚠️ Playlist fetch restricted. Falling back to search for trending tracks...');
    const fallback = await this.fetchSpotify('/search?q=hits%202026&type=track&limit=10');
    if (fallback && fallback.tracks && fallback.tracks.items && fallback.tracks.items.length > 0) {
      return fallback.tracks.items
        .map((item: any) => this.mapTrack(item))
        .filter((t: any) => t !== null);
    }

    return MOCK_TRACKS;
  }

  public async getNewReleases(languages?: string[], artists?: string[]): Promise<any[]> {
    if (!this.isSpotifyConfigured) return MOCK_ALBUMS;

    if ((languages && languages.length > 0) || (artists && artists.length > 0)) {
      const queries: string[] = [];
      if (artists && artists.length > 0) {
        const artistQuery = artists.map(art => `artist:"${art}"`).join(' OR ');
        queries.push(artistQuery);
      }
      if (languages && languages.length > 0) {
        languages.forEach(lang => {
          if (lang === 'hindi') queries.push('bollywood new release');
          else if (lang === 'tamil') queries.push('tamil new release');
          else if (lang === 'telugu') queries.push('telugu new release');
          else if (lang === 'punjabi') queries.push('punjabi new release');
          else if (lang === 'spanish') queries.push('latin new release');
          else if (lang === 'korean') queries.push('k-pop new release');
          else if (lang === 'english') queries.push('pop new release');
        });
      }
      
      const query = queries.join(' OR ');
      const result = await this.fetchSpotify(`/search?q=${encodeURIComponent(query)}&type=album&limit=10`);
      if (result && result.albums && result.albums.items && result.albums.items.length > 0) {
        return result.albums.items
          .filter(Boolean)
          .map((a: any) => this.mapAlbum(a))
          .filter((a: any) => a !== null);
      }
    }

    // Default global releases
    const result = await this.fetchSpotify('/browse/new-releases?limit=10');
    if (result && result.albums && result.albums.items && result.albums.items.length > 0) {
      return result.albums.items
        .map((item: any) => this.mapAlbum(item))
        .filter((a: any) => a !== null);
    }

    // Fallback to search by year if browse/new-releases is restricted (403)
    logger.info('⚠️ Browse new-releases restricted. Falling back to search for latest albums...');
    const currentYear = new Date().getFullYear();
    const fallback = await this.fetchSpotify(`/search?q=year:${currentYear-1}-${currentYear}&type=album&limit=10`);
    if (fallback && fallback.albums && fallback.albums.items && fallback.albums.items.length > 0) {
      return fallback.albums.items
        .map((item: any) => this.mapAlbum(item))
        .filter((a: any) => a !== null);
    }

    return MOCK_ALBUMS;
  }

  public async getRecommendedTracks(): Promise<any[]> {
    if (!this.isSpotifyConfigured) return MOCK_TRACKS.slice().reverse();
    const result = await this.fetchSpotify('/recommendations?limit=10&seed_genres=electronic,pop,synthwave');
    if (result && result.tracks && result.tracks.length > 0) {
      return result.tracks
        .map((t: any) => this.mapTrack(t))
        .filter((t: any) => t !== null);
    }

    // Fallback to search
    logger.info('⚠️ Recommendations restricted. Falling back to search for recommended tracks...');
    const fallback = await this.fetchSpotify('/search?q=hits&type=track&limit=10');
    if (fallback && fallback.tracks && fallback.tracks.items && fallback.tracks.items.length > 0) {
      return fallback.tracks.items
        .map((item: any) => this.mapTrack(item))
        .filter((t: any) => t !== null);
    }

    return MOCK_TRACKS.slice().reverse();
  }

  public async getRecommendationsByGenres(genres: string[], limit = 20): Promise<any[]> {
    if (!this.isSpotifyConfigured) {
      return [...MOCK_TRACKS].sort(() => Math.random() - 0.5).slice(0, limit);
    }
    
    // Attempt standard recommendations
    const seeds = genres.slice(0, 5).join(',');
    const result = await this.fetchSpotify(
      `/recommendations?limit=${limit}&seed_genres=${encodeURIComponent(seeds)}`
    );
    if (result && result.tracks && result.tracks.length > 0) {
      return result.tracks
        .map((t: any) => this.mapTrack(t))
        .filter((t: any) => t !== null);
    }

    // Fallback to search by genre (e.g. genre:"pop" OR genre:"hip-hop")
    logger.info(`⚠️ Recommendations by genre restricted. Falling back to search for genre seeds: ${genres.join(', ')}...`);
    const query = genres.map(g => `genre:"${g}"`).join(' OR ');
    const fallback = await this.fetchSpotify(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`);
    if (fallback && fallback.tracks && fallback.tracks.items && fallback.tracks.items.length > 0) {
      return fallback.tracks.items
        .map((t: any) => this.mapTrack(t))
        .filter((t: any) => t !== null);
    }

    // Secondary fallback: plain text query of genres
    const plainQuery = genres.join(' ');
    const plainFallback = await this.fetchSpotify(`/search?q=${encodeURIComponent(plainQuery)}&type=track&limit=${limit}`);
    if (plainFallback && plainFallback.tracks && plainFallback.tracks.items && plainFallback.tracks.items.length > 0) {
      return plainFallback.tracks.items
        .map((t: any) => this.mapTrack(t))
        .filter((t: any) => t !== null);
    }

    return [...MOCK_TRACKS].sort(() => Math.random() - 0.5).slice(0, limit);
  }


  public async getTrack(id: string): Promise<any> {
    if (!this.isSpotifyConfigured || id.startsWith('rec-') || id.startsWith('hero-')) {
      return MOCK_TRACKS.find(t => t.id === id) || MOCK_TRACKS[0];
    }
    const result = await this.fetchSpotify(`/tracks/${id}`);
    return this.mapTrack(result);
  }

  public async getTracks(ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];
    if (!this.isSpotifyConfigured) {
      return ids.map(id => MOCK_TRACKS.find(t => t.id === id) || MOCK_TRACKS[0]).filter(Boolean);
    }

    // Filter out mock IDs and query in chunks of 50 (Spotify limit)
    const mockIds = ids.filter(id => id.startsWith('rec-') || id.startsWith('hero-'));
    const spotifyIds = ids.filter(id => !id.startsWith('rec-') && !id.startsWith('hero-'));

    let results: any[] = [];

    // Map mocks directly
    mockIds.forEach(id => {
      const match = MOCK_TRACKS.find(t => t.id === id);
      if (match) results.push(match);
    });

    if (spotifyIds.length > 0) {
      // Chunk requests
      for (let i = 0; i < spotifyIds.length; i += 50) {
        const chunk = spotifyIds.slice(i, i + 50);
        const result = await this.fetchSpotify(`/tracks?ids=${chunk.join(',')}`);
        if (result && result.tracks) {
          const mapped = result.tracks.map((t: any) => this.mapTrack(t)).filter(Boolean);
          results.push(...mapped);
        }
      }
    }

    // Retain original order
    return ids.map(id => results.find(t => t.id === id)).filter(Boolean);
  }

  public async getAlbum(id: string): Promise<any> {
    if (!this.isSpotifyConfigured || id.startsWith('alb-')) {
      const alb = MOCK_ALBUMS.find(a => a.id === id) || MOCK_ALBUMS[0];
      return alb;
    }
    const result = await this.fetchSpotify(`/albums/${id}`);
    return this.mapAlbum(result);
  }

  public async getArtist(id: string): Promise<any> {
    if (!this.isSpotifyConfigured || id.startsWith('art-')) {
      return MOCK_ARTISTS.find(a => a.id === id) || MOCK_ARTISTS[0];
    }
    const result = await this.fetchSpotify(`/artists/${id}`);
    return this.mapArtist(result);
  }

  public async getArtistTopTracks(id: string): Promise<any[]> {
    if (!this.isSpotifyConfigured || id.startsWith('art-')) {
      return MOCK_TRACKS.filter(t => t.artists.some((a: any) => a.id === id));
    }
    // market parameter is required for top-tracks
    const result = await this.fetchSpotify(`/artists/${id}/top-tracks?market=US`);
    if (!result || !result.tracks) return [];

    return result.tracks
      .map((t: any) => this.mapTrack(t))
      .filter((t: any) => t !== null);
  }

  public async getArtistAlbums(id: string): Promise<any[]> {
    if (!this.isSpotifyConfigured || id.startsWith('art-')) {
      return MOCK_ALBUMS.filter(a => a.artist.id === id);
    }
    const result = await this.fetchSpotify(`/artists/${id}/albums?limit=10`);
    if (!result || !result.items) return [];

    return result.items
      .map((a: any) => this.mapAlbum(a))
      .filter((a: any) => a !== null);
  }

  public async getRelatedArtists(id: string): Promise<any[]> {
    if (!this.isSpotifyConfigured || id.startsWith('art-')) {
      return MOCK_ARTISTS.filter(a => a.id !== id).slice(0, 3);
    }
    const result = await this.fetchSpotify(`/artists/${id}/related-artists`);
    if (!result || !result.artists) return [];

    return result.artists
      .map((a: any) => this.mapArtist(a))
      .slice(0, 5)
      .filter((a: any) => a !== null);
  }

  public async getCategories(): Promise<any[]> {
    if (!this.isSpotifyConfigured) return MOCK_CATEGORIES;
    const result = await this.fetchSpotify('/browse/categories?limit=20');
    if (!result || !result.categories) return MOCK_CATEGORIES;

    // Build standard gradients
    const gradients = [
      'from-[#4720ca] to-[#0b0b0f]',
      'from-[#1ed760] to-[#0b0b0f]',
      'from-[#ff6584] to-[#0b0b0f]',
      'from-[#8cbeff] to-[#0b0b0f]',
      'from-[#ff8c00] to-[#0b0b0f]',
      'from-[#00ced1] to-[#0b0b0f]'
    ];

    return result.categories.items.map((c: any, index: number) => ({
      id: c.id,
      name: c.name,
      cover: c.icons?.[0]?.url || null,
      gradient: gradients[index % gradients.length]
    }));
  }

  public async getMoodPlaylists(moodId: string): Promise<any[]> {
    if (!this.isSpotifyConfigured) {
      return [
        { id: 'play-1', title: `${moodId} Chillout`, cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80', tracksCount: 10, isPublic: true }
      ];
    }
    const result = await this.fetchSpotify(`/browse/categories/${moodId}/playlists?limit=5`);
    if (!result || !result.playlists) return [];

    return result.playlists.items.map((p: any) => ({
      id: p.id,
      title: p.name,
      description: p.description,
      cover: p.images?.[0]?.url || null,
      tracksCount: p.tracks?.total || 0,
      owner: p.owner?.display_name || 'Spotify',
      isPublic: p.public || true
    }));
  }

  public async search(query: string): Promise<any> {
    if (!query.trim()) {
      return { tracks: [], albums: [], artists: [], playlists: [] };
    }

    if (!this.isSpotifyConfigured) {
      const q = query.toLowerCase();
      const tracks = MOCK_TRACKS.filter(t => t.title.toLowerCase().includes(q) || t.artists.some(a => a.name.toLowerCase().includes(q)));
      const albums = MOCK_ALBUMS.filter(a => a.title.toLowerCase().includes(q) || a.artist.name.toLowerCase().includes(q));
      const artists = MOCK_ARTISTS.filter(a => a.name.toLowerCase().includes(q));
      return { tracks, albums, artists, playlists: [] };
    }

    const encodedQuery = encodeURIComponent(query);
    const result = await this.fetchSpotify(`/search?q=${encodedQuery}&type=track,album,artist,playlist&limit=10`);

    return {
      tracks: result?.tracks?.items?.filter(Boolean).map((t: any) => this.mapTrack(t)).filter(Boolean) || [],
      albums: result?.albums?.items?.filter(Boolean).map((a: any) => this.mapAlbum(a)).filter(Boolean) || [],
      artists: result?.artists?.items?.filter(Boolean).map((a: any) => this.mapArtist(a)).filter(Boolean) || [],
      playlists: result?.playlists?.items?.filter(Boolean).map((p: any) => ({
        id: p.id,
        title: p.name,
        description: p.description,
        cover: p.images?.[0]?.url || null,
        tracksCount: p.tracks?.total || 0,
        owner: p.owner?.display_name || 'Spotify',
        isPublic: p.public || true
      })).filter(Boolean) || []
    };
  }

  public async getRecommendations(languages: string[], artists: string[], limit = 20): Promise<any[]> {
    if (!this.isSpotifyConfigured) {
      return [...MOCK_TRACKS].sort(() => Math.random() - 0.5).slice(0, limit);
    }

    const searchQueries: string[] = [];

    // 1. Build query for selected artists (e.g. artist:"Anirudh" OR artist:"Taylor Swift")
    if (artists.length > 0) {
      const artistQuery = artists.map(art => `artist:"${art}"`).join(' OR ');
      searchQueries.push(artistQuery);
    }

    // 2. Build queries for languages
    if (languages.length > 0) {
      languages.forEach(lang => {
        if (lang === 'hindi') searchQueries.push('bollywood hits');
        else if (lang === 'tamil') searchQueries.push('tamil hits');
        else if (lang === 'telugu') searchQueries.push('telugu hits');
        else if (lang === 'punjabi') searchQueries.push('punjabi hits');
        else if (lang === 'spanish') searchQueries.push('latin hits');
        else if (lang === 'korean') searchQueries.push('k-pop');
      });
    }

    if (searchQueries.length === 0) {
      searchQueries.push('hits');
    }

    try {
      const fetchPromises = searchQueries.map(q =>
        this.fetchSpotify(`/search?q=${encodeURIComponent(q)}&type=track&limit=${Math.ceil(limit / searchQueries.length) + 5}`)
      );
      const results = await Promise.all(fetchPromises);

      const tracks: any[] = [];
      const seen = new Set<string>();

      results.forEach(res => {
        if (res && res.tracks && res.tracks.items) {
          res.tracks.items.forEach((item: any) => {
            const track = this.mapTrack(item);
            if (track && !seen.has(track.id)) {
              seen.add(track.id);
              tracks.push(track);
            }
          });
        }
      });

      return tracks.sort(() => Math.random() - 0.5).slice(0, limit);
    } catch (err) {
      logger.error('❌ Failed to fetch personalized search-based recommendations:', err);
      return [...MOCK_TRACKS].sort(() => Math.random() - 0.5).slice(0, limit);
    }
  }

  public async getSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];
    if (!this.isSpotifyConfigured) {
      const q = query.toLowerCase();
      return MOCK_TRACKS.filter(t => t.title.toLowerCase().includes(q)).map(t => t.title).slice(0, 5);
    }

    const encodedQuery = encodeURIComponent(query);
    const result = await this.fetchSpotify(`/search?q=${encodedQuery}&type=track&limit=5`);

    return result?.tracks?.items?.map((t: any) => t.name) || [];
  }
}

