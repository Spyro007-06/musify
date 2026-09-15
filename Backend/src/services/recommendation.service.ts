import { prisma } from '@config/database';
import { SaavnService } from './saavn.service';
import { logger } from '@utils/logger';

export class RecommendationService {
  private static saavn = SaavnService.getInstance();

  /**
   * Sync user preferences from onboarding
   */
  public static async updateUserPreferences(
    userId: string,
    preferences: {
      favouriteGenres?: string[];
      favouriteArtists?: string[];
      favouriteLanguages?: string[];
      favouriteAlbums?: string[];
      favouriteMoods?: string[];
    }
  ): Promise<void> {
    const { favouriteGenres, favouriteArtists, favouriteLanguages, favouriteAlbums, favouriteMoods } = preferences;

    const queries: any[] = [
      prisma.userPreferences.upsert({
        where: { userId },
        update: {
          favouriteLanguages: favouriteLanguages || [],
          favouriteAlbums: favouriteAlbums || [],
        },
        create: {
          userId,
          favouriteLanguages: favouriteLanguages || [],
          favouriteAlbums: favouriteAlbums || [],
        },
      })
    ];

    if (favouriteGenres && favouriteGenres.length > 0) {
      for (const genre of favouriteGenres) {
        queries.push(
          prisma.genreAffinity.upsert({
            where: { userId_genre: { userId, genre: genre.toLowerCase() } },
            update: { score: { increment: 5.0 } },
            create: { userId, genre: genre.toLowerCase(), score: 10.0 },
          })
        );
      }
    }

    if (favouriteArtists && favouriteArtists.length > 0) {
      for (const artist of favouriteArtists) {
        queries.push(
          prisma.artistAffinity.upsert({
            where: { userId_spotifyArtistId: { userId, spotifyArtistId: artist } },
            update: { score: { increment: 5.0 } },
            create: { userId, spotifyArtistId: artist, score: 10.0 },
          })
        );
      }
    }

    queries.push(
      prisma.recommendationCache.deleteMany({
        where: { userId },
      })
    );

    await prisma.$transaction(queries);
  }

  /**
   * Get user preferences
   */
  public static async getUserPreferences(userId: string): Promise<any> {
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
    });
    
    const genres = await prisma.genreAffinity.findMany({
      where: { userId },
      orderBy: { score: 'desc' }
    });
    
    const artists = await prisma.artistAffinity.findMany({
      where: { userId },
      orderBy: { score: 'desc' }
    });

    return {
      favouriteLanguages: prefs?.favouriteLanguages || [],
      favouriteAlbums: prefs?.favouriteAlbums || [],
      favouriteGenres: genres.map((g: any) => g.genre),
      favouriteArtists: artists.map((a: any) => a.spotifyArtistId),
      favouriteMoods: []
    };
  }

  /**
   * Log play history session
   */
  public static async logPlayHistory(
    userId: string,
    historyData: {
      spotifyTrackId: string;
      albumId?: string;
      artistId?: string;
      genre?: string;
      device?: string;
      sessionDuration?: number;
      listenPercentage?: number;
      completedSong?: boolean;
      skipTime?: number;
      numberOfReplays?: number;
    }
  ): Promise<void> {
    const {
      spotifyTrackId,
      albumId,
      artistId,
      genre,
      device,
      sessionDuration,
      listenPercentage,
      completedSong,
      skipTime,
      numberOfReplays,
    } = historyData;
    const queries: any[] = [
      prisma.listeningHistory.create({
        data: {
          userId,
          spotifyTrackId,
          albumId,
          artistId,
          genre,
          device,
          sessionDuration,
          listenPercentage,
          completedSong: completedSong || false,
          numberOfReplays: numberOfReplays || 0,
        },
      })
    ];

    if (artistId && completedSong) {
       queries.push(
         prisma.artistAffinity.upsert({
           where: { userId_spotifyArtistId: { userId, spotifyArtistId: artistId } },
           update: { score: { increment: 1.0 } },
           create: { userId, spotifyArtistId: artistId, score: 1.0 },
         })
       );
    }

    if (genre && completedSong) {
       queries.push(
         prisma.genreAffinity.upsert({
           where: { userId_genre: { userId, genre: genre.toLowerCase() } },
           update: { score: { increment: 1.0 } },
           create: { userId, genre: genre.toLowerCase(), score: 1.0 },
         })
       );
    }

    queries.push(
      prisma.recommendationCache.deleteMany({
        where: { userId },
      })
    );

    await prisma.$transaction(queries);
  }

  /**
   * Log like action
   */
  public static async logLike(userId: string, targetId: string, type: 'song' | 'album' | 'artist'): Promise<void> {
    const queries: any[] = [];
    if (type === 'song') {
      queries.push(
        prisma.likedTrack.upsert({
          where: { userId_spotifyTrackId: { userId, spotifyTrackId: targetId } },
          update: {},
          create: { userId, spotifyTrackId: targetId },
        })
      );
    } else if (type === 'album') {
      queries.push(
        prisma.likedAlbum.upsert({
          where: { userId_albumId: { userId, albumId: targetId } },
          update: {},
          create: { userId, albumId: targetId },
        })
      );
    } else if (type === 'artist') {
      queries.push(
        prisma.artistAffinity.upsert({
          where: { userId_spotifyArtistId: { userId, spotifyArtistId: targetId } },
          update: { score: { increment: 10.0 }, isFollowed: true },
          create: { userId, spotifyArtistId: targetId, score: 20.0, isFollowed: true },
        })
      );
    }

    queries.push(
      prisma.recommendationCache.deleteMany({
        where: { userId },
      })
    );

    await prisma.$transaction(queries);
  }

  /**
   * Log dislike action
   */
  public static async logDislike(userId: string, spotifyTrackId: string): Promise<void> {
    const queries = [
      prisma.dislikedSong.upsert({
        where: { userId_spotifyTrackId: { userId, spotifyTrackId } },
        update: {},
        create: { userId, spotifyTrackId },
      }),
      prisma.likedTrack.deleteMany({ // deleteMany won't throw if not found
        where: { userId, spotifyTrackId },
      }),
      prisma.recommendationCache.deleteMany({
        where: { userId },
      })
    ];

    await prisma.$transaction(queries);
  }

  /**
   * Log skip action
   */
  public static async logSkip(userId: string, spotifyTrackId: string, skipTime: number, duration: number): Promise<void> {
    const listenPercentage = duration > 0 ? (skipTime / duration) * 100 : 0;
    
    const queries = [
      prisma.listeningHistory.create({
        data: {
          userId,
          spotifyTrackId,
          listenPercentage,
          completedSong: false,
        },
      }),
      prisma.skippedSongs.create({
        data: {
          userId,
          spotifyTrackId,
          skipTime
        }
      }),
      prisma.recommendationCache.deleteMany({
        where: { userId },
      })
    ];

    await prisma.$transaction(queries);
  }

  /**
   * Invalidate recommendation cache for user
   */
  public static async invalidateCache(userId: string): Promise<void> {
    await prisma.recommendationCache.deleteMany({
      where: { userId },
    });
  }

  /**
   * Metadata similarity scorer (0.0 to 1.0)
   */
  private static calculateSimilarity(trackA: any, trackB: any): number {
    if (!trackA || !trackB) return 0;
    let score = 0;

    const artistA = trackA.artists?.[0]?.name?.toLowerCase() || '';
    const artistB = trackB.artists?.[0]?.name?.toLowerCase() || '';
    if (artistA && artistB && (artistA.includes(artistB) || artistB.includes(artistA))) {
      score += 0.5;
    }

    const genreA = (trackA.genre || '').toLowerCase();
    const genreB = (trackB.genre || '').toLowerCase();
    if (genreA && genreB && (genreA.includes(genreB) || genreB.includes(genreA))) {
      score += 0.3;
    }

    if (trackA.album?.id && trackB.album?.id && trackA.album.id === trackB.album.id) {
      score += 0.2;
    }

    return score;
  }

  /**
   * Flat recommendations for songs sorted by recommendation score
   */
  public static async getRecommendedSongs(userId: string, limit = 50): Promise<any[]> {
    const candidates = await this.getCandidatePool(userId);
    const scored = await this.scoreCandidates(userId, candidates);
    const sorted = scored.sort((a, b) => b.score - a.score).map(s => s.track);
    return this.populateLikes(sorted, userId);
  }

  /**
   * Recommended Albums
   */
  public static async getRecommendedAlbums(userId: string, limit = 10): Promise<any[]> {
    const prefs = await this.getUserPreferences(userId);
    const history = await prisma.listeningHistory.findMany({
      where: { userId, completedSong: true },
      take: 20,
      orderBy: { timestamp: 'desc' },
    });

    const artistNames = new Set<string>(prefs?.favouriteArtists || []);
    const languages = prefs?.favouriteLanguages || ['english', 'hindi'];

    history.forEach((h: any) => {
      if (h.artistId) artistNames.add(h.artistId);
    });

    const releases = await this.saavn.getNewReleases(languages);
    
    const scoredAlbums = releases.map(album => {
      let score = 0;
      const albumArtist = (album.artist?.name || '').toLowerCase();
      artistNames.forEach((art: any) => {
        if (albumArtist.includes(art.toLowerCase())) {
          score += 15;
        }
      });

      if (prefs?.favouriteLanguages.some((lang: any) => (album.genre || '').toLowerCase().includes(lang.toLowerCase()))) {
        score += 5;
      }

      return { album, score };
    });

    return scoredAlbums
      .sort((a, b) => b.score - a.score)
      .map(s => s.album)
      .slice(0, limit);
  }

  /**
   * Recommended Artists
   */
  public static async getRecommendedArtists(userId: string, limit = 10): Promise<any[]> {
    const prefs = await this.getUserPreferences(userId);
    const followed = await prisma.artistAffinity.findMany({ where: { userId } });
    
    const seedArtistNames = new Set<string>([
      ...(prefs?.favouriteArtists || []),
      ...followed.map((f: any) => f.spotifyArtistId)
    ]);

    const similarArtistsPool: any[] = [];
    const seen = new Set<string>();

    const topSeedArtists = Array.from(seedArtistNames).slice(0, 3);
    const searchPromises = topSeedArtists.map(async (artistName) => {
      const searchRes = await this.saavn.search(artistName);
      if (searchRes.artists && searchRes.artists[0]) {
        return this.saavn.getRelatedArtists(searchRes.artists[0].id);
      }
      return [];
    });

    const relatedResults = await Promise.all(searchPromises);
    relatedResults.forEach((related: any[]) => {
      related.forEach((art: any) => {
        if (art && !seen.has(art.name) && !seedArtistNames.has(art.name)) {
          seen.add(art.name);
          similarArtistsPool.push(art);
        }
      });
    });

    if (similarArtistsPool.length === 0) {
      const langs = prefs?.favouriteLanguages || ['hindi', 'english'];
      const langPromises = langs.map(async (lang: any) => {
        return this.saavn.search(`${lang} artists`);
      });
      const langResults = await Promise.all(langPromises);
      langResults.forEach(searchRes => {
        if (searchRes && searchRes.artists) {
          searchRes.artists.forEach((art: any) => {
            if (art && !seen.has(art.name)) {
              seen.add(art.name);
              similarArtistsPool.push(art);
            }
          });
        }
      });
    }

    return similarArtistsPool.slice(0, limit);
  }

  /**
   * Flat discovery weekly list
   */
  public static async getDiscoverWeekly(userId: string): Promise<any[]> {
    const candidates = await this.getCandidatePool(userId);
    const scored = await this.scoreCandidates(userId, candidates);
    
    const userHistory = await prisma.listeningHistory.findMany({
      where: { userId },
      select: { spotifyTrackId: true }
    });
    const historyTrackIds = new Set(userHistory.map((h: any) => h.spotifyTrackId));

    const discoveryTracks = scored
      .filter(s => !historyTrackIds.has(s.track.id))
      .sort((a, b) => b.score - a.score)
      .map(s => s.track)
      .slice(0, 30);

    return this.populateLikes(discoveryTracks, userId);
  }

  /**
   * Main entrypoint for dynamic dashboard sections
   */
  public static async getDashboardRecommendations(userId: string): Promise<any[]> {
    const now = new Date();

    // 1. Check cache first
    const cached = await prisma.recommendationCache.findMany({
      where: { userId, expiresAt: { gt: now } },
    });

    if (cached.length > 0) {
      return cached.map(c => ({
        id: c.sectionType,
        ...c.cachedData as any,
      }));
    }

    const prefs = await this.getUserPreferences(userId);
    const selectedLanguages = prefs?.favouriteLanguages || ['english'];
    const selectedArtists = prefs?.favouriteArtists || [];

    const candidates = await this.getCandidatePool(userId);
    const scored = await this.scoreCandidates(userId, candidates);
    const sections: any[] = [];

    const getDiverseTracksForSection = (
      filterFn: (s: any) => boolean,
      reasonGenerator: (s: any) => string,
      limit = 10
    ) => {
      let available = scored.filter(filterFn).map(c => ({ ...c }));
      const diverse: any[] = [];
      const artistCounts = new Map<string, number>();

      while (diverse.length < limit && available.length > 0) {
        available.forEach(item => {
          let penalty = 0;
          const trackArtists = item.track.artists || [];
          trackArtists.forEach((a: any) => {
            const count = artistCounts.get(a.name) || 0;
            penalty += (count * 15);
          });
          item.currentScore = item.score - penalty;
        });

        available.sort((a, b) => b.currentScore - a.currentScore);
        const picked = available.shift();
        if (!picked) break;

        const trackArtists = picked.track.artists || [];
        trackArtists.forEach((a: any) => {
          artistCounts.set(a.name, (artistCounts.get(a.name) || 0) + 1);
        });

        diverse.push({
          ...picked.track,
          reason: reasonGenerator(picked),
        });
      }
      return diverse;
    };

    const history = await prisma.listeningHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });
    
    // 1. Good Morning / Afternoon / Evening
    const hour = new Date().getHours();
    let timeTitle = 'Good Afternoon';
    let timeVibe = 'focus';
    if (hour >= 18 || hour < 4) {
      timeTitle = 'Good Evening';
      timeVibe = 'chill';
    } else if (hour >= 5 && hour < 12) {
      timeTitle = 'Good Morning';
      timeVibe = 'energy';
    }

    const timeTracks = getDiverseTracksForSection(
      (s) => {
        const g = (s.track.genre || '').toLowerCase();
        return timeVibe === 'energy' ? (g.includes('pop') || g.includes('dance')) : (g.includes('lofi') || g.includes('chill') || g.includes('acoustic'));
      },
      () => `Matches your ${timeTitle.split(' ')[1].toLowerCase()} vibe`,
      10
    );
    // Fallback if empty
    const finalTimeTracks = timeTracks.length > 0 ? timeTracks : getDiverseTracksForSection(() => true, () => 'Recommended for you', 10);
    sections.push({
      id: 'time-of-day',
      title: timeTitle,
      subtitle: 'Personalized picks to start right',
      type: 'tracks',
      items: await this.populateLikes(finalTimeTracks, userId),
    });

    // 2. Recently Played
    if (history.length > 0) {
      const recentIds = Array.from(new Set(history.map((h: any) => h.spotifyTrackId))) as string[];
      const recentTracks = await this.saavn.getTracks(recentIds.slice(0, 10));
      sections.push({
        id: 'recently-played',
        title: 'Recently Played',
        subtitle: 'Jump back in',
        type: 'tracks',
        items: await this.populateLikes(recentTracks, userId),
      });
    }

    // 3. Because You Like...
    const topArtistName = await this.getTopPlayedArtist(userId);
    const targetArtist = topArtistName || (selectedArtists.length > 0 ? selectedArtists[0] : null);
    if (targetArtist) {
      const artistRecs = getDiverseTracksForSection(
        (s) => {
          const trackArtists = (s.track.artists || []).map((a: any) => a.name.toLowerCase());
          return trackArtists.some((name: string) => name.includes(targetArtist.toLowerCase()));
        },
        () => `Featuring ${targetArtist}`,
        10
      );
      if (artistRecs.length > 0) {
        sections.push({
          id: 'because-you-like',
          title: `Because You Like ${targetArtist}`,
          subtitle: 'Dive deeper into their sound',
          type: 'tracks',
          items: await this.populateLikes(artistRecs, userId),
        });
      }
    }

    // 4. Continue Listening
    const incomplete = history.filter((h: any) => h.completedSong === false);
    if (incomplete.length > 0) {
      const incIds = Array.from(new Set(incomplete.map((h: any) => h.spotifyTrackId))) as string[];
      const incTracks = await this.saavn.getTracks(incIds.slice(0, 10));
      sections.push({
        id: 'continue-listening',
        title: 'Continue Listening',
        subtitle: 'Pick up where you left off',
        type: 'tracks',
        items: await this.populateLikes(incTracks, userId),
      });
    }

    // 5. Hidden Gems (< 100k plays)
    const hiddenGems = getDiverseTracksForSection(
      (s) => s.track.playCount < 100000,
      () => 'Undiscovered masterpiece',
      10
    );
    if (hiddenGems.length > 0) {
      sections.push({
        id: 'hidden-gems',
        title: 'Hidden Gems',
        subtitle: 'Lesser known tracks tailored to your taste',
        type: 'tracks',
        items: await this.populateLikes(hiddenGems, userId),
      });
    }

    // 6. Trending Near You (Trending + Language filter)
    const trendingLocal = getDiverseTracksForSection(
      (s) => s.isTrending && selectedLanguages.some((lang: string) => (s.track.genre || '').toLowerCase().includes(lang.toLowerCase())),
      () => 'Trending in your language',
      10
    );
    if (trendingLocal.length > 0) {
      sections.push({
        id: 'trending-near-you',
        title: 'Trending Near You',
        subtitle: 'Hot tracks right now',
        type: 'tracks',
        items: await this.populateLikes(trendingLocal, userId),
      });
    }

    // 7. New Releases
    const freshReleases = getDiverseTracksForSection(
      (s) => s.isNewRelease === true,
      () => 'Brand new music',
      10
    );
    if (freshReleases.length > 0) {
      sections.push({
        id: 'new-releases',
        title: 'New Releases',
        subtitle: 'Fresh drops',
        type: 'tracks',
        items: await this.populateLikes(freshReleases, userId),
      });
    }

    // 8. Discover Weekly
    const discoverTracks = await this.getDiscoverWeekly(userId);
    if (discoverTracks.length > 0) {
      sections.push({
        id: 'discover-weekly',
        title: 'Discover Weekly',
        subtitle: 'New tracks you have never heard',
        type: 'tracks',
        items: discoverTracks.slice(0, 10),
      });
    }

    await this.cacheDashboardSections(userId, sections);
    return sections;
  }


  /**
   * Helper to fetch tracks for onboarding artists (Priority 1, 4)
   */
  private static async getOnboardingArtistTracks(languages: string[], artists: string[]): Promise<any[]> {
    const tracks: any[] = [];
    const seen = new Set<string>();

    const addTrack = (t: any) => {
      if (t && !seen.has(t.id)) {
        seen.add(t.id);
        tracks.push(t);
      }
    };

    for (const artistName of artists) {
      const searchRes = await this.saavn.search(artistName);
      if (searchRes.artists && searchRes.artists[0]) {
        const topTracks = await this.saavn.getArtistTopTracks(searchRes.artists[0].id);
        
        // Filter by language (Priority 2)
        const langFiltered = topTracks.filter((t: any) => 
          languages.some((lang: any) => (t.genre || '').toLowerCase().includes(lang.toLowerCase()))
        );

        langFiltered.forEach(addTrack);

        // Fallback: If we have less than 5 tracks, find similar artists (Priority 4)
        if (langFiltered.length < 5) {
          const similar = await this.saavn.getRelatedArtists(searchRes.artists[0].id);
          for (const simArtist of similar) {
            const simTopTracks = await this.saavn.getArtistTopTracks(simArtist.id);
            const simLangFiltered = simTopTracks.filter((t: any) => 
              languages.some((lang: any) => (t.genre || '').toLowerCase().includes(lang.toLowerCase()))
            );
            simLangFiltered.forEach(addTrack);
          }
        }
      }
    }

    return tracks;
  }

  /**
   * Helper to cache dashboard sections
   */
  private static async cacheDashboardSections(userId: string, sections: any[]): Promise<void> {
    const cacheExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL
    for (const section of sections) {
      await prisma.recommendationCache.upsert({
        where: {
          userId_sectionType: { userId, sectionType: section.id },
        },
        update: {
          cachedData: {
            title: section.title,
            subtitle: section.subtitle,
            type: section.type,
            items: section.items,
          },
          expiresAt: cacheExpires,
        },
        create: {
          userId,
          sectionType: section.id,
          cachedData: {
            title: section.title,
            subtitle: section.subtitle,
            type: section.type,
            items: section.items,
          },
          expiresAt: cacheExpires,
        },
      });
    }
  }

  /**
   * Fetch candidates from multiple sources
   */
  private static async getCandidatePool(userId: string): Promise<any[]> {
    const candidates: any[] = [];
    const seen = new Set<string>();

    const addTrack = (track: any) => {
      if (track && !seen.has(track.id)) {
        seen.add(track.id);
        candidates.push(track);
      }
    };

    try {
      const prefs = await this.getUserPreferences(userId);
      const languages = prefs?.favouriteLanguages || [];
      const queryLangs = languages.length > 0 ? languages : ['english', 'hindi'];
      
      const trending = await this.saavn.getTrendingTracks(queryLangs);
      trending.forEach(addTrack);

      const newReleases = await this.saavn.getNewReleases(queryLangs);
      newReleases.forEach((album: any) => {
        if (album.tracks) {
          album.tracks.forEach(addTrack);
        }
      });

      const likes = await prisma.likedTrack.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      if (likes.length > 0) {
        const likedIds = likes.map(l => l.spotifyTrackId);
        const likedTracks = await this.saavn.getTracks(likedIds);
        likedTracks.forEach(addTrack);

        const genres = Array.from(new Set(likedTracks.map(t => t.genre).filter(Boolean)));
        const artists = Array.from(new Set(likedTracks.flatMap(t => t.artists?.map((a: any) => a.name) || [])));
        
        if (genres.length > 0 || artists.length > 0) {
          const recs = await this.saavn.getRecommendations(
            genres.slice(0, 3),
            artists.slice(0, 3),
            30
          );
          recs.forEach(addTrack);
        }
      }

      const searches = await prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const searchPromises = searches.map(async (search) => {
        return this.saavn.search(search.query);
      });
      const searchResults = await Promise.all(searchPromises);
      searchResults.forEach(searchRes => {
        if (searchRes && searchRes.tracks) {
          searchRes.tracks.forEach(addTrack);
        }
      });

      const followed = await prisma.artistAffinity.findMany({ where: { userId } });
      const followPromises = followed.slice(0, 3).map(async (follow: any) => {
        const searchRes = await this.saavn.search(follow.spotifyArtistId);
        if (searchRes.artists && searchRes.artists[0]) {
          return this.saavn.getArtistTopTracks(searchRes.artists[0].id);
        }
        return [];
      });
      const followResults = await Promise.all(followPromises);
      followResults.forEach((topTracks: any[]) => {
        if (topTracks && topTracks.length) {
          topTracks.forEach(addTrack);
        }
      });

      // Filter candidates by preferred languages (strict requirement)
      if (languages.length > 0) {
        const lowerLangs = languages.map((l: string) => l.toLowerCase());
        const filteredCandidates = candidates.filter(track => {
          const trackLang = (track.genre || '').toLowerCase();
          return lowerLangs.some((l: string) => trackLang.includes(l) || l.includes(trackLang));
        });
        return filteredCandidates;
      }
    } catch (err) {
      logger.error('Error generating candidate pool:', err);
    }

    return candidates;
  }

  /**
   * Deterministic Scoring Engine (Max 100 points)
   * - 35% Listening History
   * - 20% Favorite Genres
   * - 15% Favorite Artists
   * - 10% Liked Songs
   * - 10% Recently Played
   * - 5% Time of Day
   * - 5% Trending Songs
   */
  private static async scoreCandidates(userId: string, candidates: any[]): Promise<any[]> {
    const scored: any[] = [];

    try {
      const prefs = await this.getUserPreferences(userId);
      const likes = await prisma.likedTrack.findMany({ where: { userId } });
      const history = await prisma.listeningHistory.findMany({ where: { userId } });
      const recentlyPlayed = await prisma.listeningHistory.findMany({ 
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 50
      });

      const likedIds = new Set(likes.map(l => l.spotifyTrackId));
      const recentIds = new Set(recentlyPlayed.map((r: any) => r.spotifyTrackId));
      
      const favouriteGenres = (prefs?.favouriteGenres || []).map((g: any) => g.toLowerCase());
      const favouriteArtists = (prefs?.favouriteArtists || []).map((a: any) => a.toLowerCase());
      
      const historyCounts = new Map<string, number>();
      history.forEach((h: any) => {
        historyCounts.set(h.spotifyTrackId, (historyCounts.get(h.spotifyTrackId) || 0) + 1);
        if (h.artistId) {
          historyCounts.set(`artist_${h.artistId}`, (historyCounts.get(`artist_${h.artistId}`) || 0) + 1);
        }
      });

      const currentHour = new Date().getHours();
      // Define time-of-day mood/genre mappings (simplified)
      const isMorning = currentHour >= 5 && currentHour < 12; // Energy, Pop, Workout
      const isEvening = currentHour >= 18 || currentHour < 5; // Chill, Lofi, Acoustic

      // Global trending query: most frequently played tracks globally in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const trendingGroups = await prisma.listeningHistory.groupBy({
        by: ['spotifyTrackId'],
        where: { timestamp: { gte: oneDayAgo } },
        _count: { spotifyTrackId: true },
        orderBy: { _count: { spotifyTrackId: 'desc' } },
        take: 100,
      });
      const globalTrendingIds = new Set(trendingGroups.map((g: any) => g.spotifyTrackId));

      for (const track of candidates) {
        let score = 0;
        let reasons: string[] = [];

        // 1. Listening History (Max 35 points)
        // Check if track or its artist is in history
        const trackPlays = historyCounts.get(track.id) || 0;
        const trackArtists = (track.artists || []).map((a: any) => a.name.toLowerCase());
        
        let artistPlays = 0;
        trackArtists.forEach((aName: string) => {
           artistPlays += (historyCounts.get(`artist_${aName}`) || 0);
        });

        let historyScore = 0;
        if (trackPlays > 0) historyScore += Math.min(trackPlays * 5, 20);
        if (artistPlays > 0) historyScore += Math.min(artistPlays * 3, 15);
        
        if (historyScore > 35) historyScore = 35;
        score += historyScore;
        if (historyScore > 0) reasons.push("Based on your listening history");

        // 2. Favorite Genres (Max 20 points)
        const genre = (track.genre || '').toLowerCase();
        let genreScore = 0;
        if (favouriteGenres.some((g: any) => genre.includes(g) || g.includes(genre))) {
          genreScore = 20;
          score += genreScore;
          reasons.push("Matches your favorite genres");
        }

        // 3. Favorite Artists (Max 15 points)
        let artistScore = 0;
        if (trackArtists.some((name: string) => favouriteArtists.some((fav: any) => name.includes(fav) || fav.includes(name)))) {
          artistScore = 15;
          score += artistScore;
          reasons.push("By one of your favorite artists");
        }

        // 4. Liked Songs (Max 10 points)
        let likedScore = 0;
        if (likedIds.has(track.id)) {
          likedScore = 10;
          score += likedScore;
          reasons.push("From your liked songs");
        }

        // 5. Recently Played (Max 10 points)
        let recentScore = 0;
        if (recentIds.has(track.id)) {
          recentScore = 10;
          score += recentScore;
          reasons.push("Recently played");
        }

        // 6. Time of Day (Max 5 points)
        let timeScore = 0;
        if (isMorning && (genre.includes('pop') || genre.includes('energy') || genre.includes('workout') || genre.includes('dance'))) {
          timeScore = 5;
          score += timeScore;
          reasons.push("Great for your morning");
        } else if (isEvening && (genre.includes('lofi') || genre.includes('chill') || genre.includes('acoustic') || genre.includes('jazz'))) {
          timeScore = 5;
          score += timeScore;
          reasons.push("Perfect for the evening");
        } else {
          // Default baseline if no specific match
          timeScore = 2;
          score += timeScore;
        }

        // 7. Trending Songs (Max 5 points)
        let trendingScore = 0;
        if (globalTrendingIds.has(track.id) || track.isTrending || track.playCount > 1000000) {
          trendingScore = 5;
          score += trendingScore;
          if (trendingScore === 5 && reasons.length < 2) reasons.push("Trending globally right now");
        }

        // Ensure score caps at 100
        score = Math.min(score, 100);

        scored.push({
          track,
          score,
          reason: reasons[0] || "Recommended for you",
          isNewRelease: track.year === new Date().getFullYear(),
          isTrending: trendingScore === 5,
        });
      }
    } catch (err) {
      logger.error('Error scoring candidates:', err);
    }

    return scored;
  }

  /**
   * Helper to fetch User top played artist
   */
  private static async getTopPlayedArtist(userId: string): Promise<string | null> {
    const history = await prisma.listeningHistory.findMany({
      where: { userId, completedSong: true },
      select: { artistId: true },
    });

    if (history.length === 0) return null;

    const counts = new Map<string, number>();
    history.forEach((h: any) => {
      if (h.artistId) {
        counts.set(h.artistId, (counts.get(h.artistId) || 0) + 1);
      }
    });

    let topArtist: string | null = null;
    let maxCount = 0;
    counts.forEach((count, artist) => {
      if (count > maxCount) {
        maxCount = count;
        topArtist = artist;
      }
    });

    return topArtist;
  }

  /**
   * Helper to attach isLiked state to track objects
   */
  private static async populateLikes(tracks: any[], userId?: string): Promise<any[]> {
    if (!userId || tracks.length === 0) return tracks.map(t => ({ ...t, isLiked: false }));

    const trackIds = tracks.map(t => t.id);
    const liked = await prisma.likedTrack.findMany({
      where: { userId, spotifyTrackId: { in: trackIds } },
      select: { spotifyTrackId: true }
    });

    const likedSet = new Set(liked.map(l => l.spotifyTrackId));
    return tracks.map(t => ({
      ...t,
      isLiked: likedSet.has(t.id),
    }));
  }

  /**
   * Smart Queue Generator
   */
  public static async generateSmartQueue(
    userId: string,
    currentContext: { trackId: string, artistName: string, genre?: string, mood?: string }
  ): Promise<any[]> {
    const { trackId, artistName, genre, mood } = currentContext;
    let candidates: any[] = [];
    const seen = new Set<string>();

    const addTrack = (t: any) => {
      if (t && !seen.has(t.id) && t.id !== trackId) {
        seen.add(t.id);
        candidates.push(t);
      }
    };

    try {
      // 1. Fetch related artists tracks
      const searchRes = await this.saavn.search(artistName);
      if (searchRes.artists && searchRes.artists[0]) {
        const topTracks = await this.saavn.getArtistTopTracks(searchRes.artists[0].id);
        topTracks.forEach(addTrack);
        
        const related = await this.saavn.getRelatedArtists(searchRes.artists[0].id);
        for (const rel of related.slice(0, 3)) {
          const relTracks = await this.saavn.getArtistTopTracks(rel.id);
          relTracks.forEach(addTrack);
        }
      }

      // 2. Fetch genre/mood hits
      if (genre || mood) {
        const query = mood ? `${mood} ${genre || ''}` : `${genre} hits`;
        const genreSearch = await this.saavn.search(query.trim());
        if (genreSearch.tracks) {
          genreSearch.tracks.forEach(addTrack);
        }
      }

      // 3. User top recommended pool
      const pool = await this.getCandidatePool(userId);
      pool.forEach(addTrack);

      // --- Scoring ---
      let scored = [];
      const history = await prisma.listeningHistory.findMany({ where: { userId } });
      const historyIds = new Set(history.map((h: any) => h.spotifyTrackId));
      
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const trendingGroups = await prisma.listeningHistory.groupBy({
        by: ['spotifyTrackId'],
        where: { timestamp: { gte: oneDayAgo } },
        _count: { spotifyTrackId: true },
        orderBy: { _count: { spotifyTrackId: 'desc' } },
        take: 100,
      });
      const globalTrendingIds = new Set(trendingGroups.map((g: any) => g.spotifyTrackId));

      for (const track of candidates) {
        let score = 0;
        let reasons = [];

        // Current Artist & Related (30%)
        const trackArtists = (track.artists || []).map((a: any) => a.name.toLowerCase());
        if (trackArtists.some((name: string) => name.includes(artistName.toLowerCase()) || artistName.toLowerCase().includes(name))) {
          score += 30;
          reasons.push(`Similar to ${artistName}`);
        } else {
           score += 10; // Related artist fallback
        }

        // Current Genre (25%)
        const trackGenre = (track.genre || '').toLowerCase();
        if (genre && (trackGenre.includes(genre.toLowerCase()) || genre.toLowerCase().includes(trackGenre))) {
          score += 25;
          reasons.push(`Matches current vibe`);
        }

        // Mood (15%)
        if (mood && (track.title.toLowerCase().includes(mood.toLowerCase()) || trackGenre.includes(mood.toLowerCase()))) {
          score += 15;
          reasons.push(`Matches your mood`);
        }

        // History Affinity (20%)
        if (historyIds.has(track.id)) {
          score += 20;
          reasons.push(`From your history`);
        }

        // Popularity (10%)
        if (globalTrendingIds.has(track.id) || track.playCount > 500000) {
          score += 10;
          if (reasons.length === 0) reasons.push(`Popular choice`);
        }

        scored.push({
          track,
          score,
          explanation: reasons[0] || 'Recommended next'
        });
      }

      // Anti-Repetition Penalty
      const finalQueue = [];
      const artistCounts = new Map<string, number>();

      // Sort descending
      scored.sort((a, b) => b.score - a.score);

      for (const item of scored) {
        if (finalQueue.length >= 20) break;
        
        let penalty = 0;
        const trackArtists = item.track.artists || [];
        trackArtists.forEach((a: any) => {
          const count = artistCounts.get(a.name) || 0;
          penalty += (count * 25); // -25 penalty for each previous play
        });

        item.score -= penalty;
      }
      
      // Re-sort after penalty
      scored.sort((a, b) => b.score - a.score);
      
      for (const item of scored) {
        if (finalQueue.length >= 20) break;
        
        const trackArtists = item.track.artists || [];
        trackArtists.forEach((a: any) => {
          artistCounts.set(a.name, (artistCounts.get(a.name) || 0) + 1);
        });

        finalQueue.push({
          ...item.track,
          explanation: item.explanation
        });
      }

      return await this.populateLikes(finalQueue, userId);

    } catch (err) {
      return [];
    }
  }
}
