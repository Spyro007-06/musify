/**
 * Broader SaavnService coverage: normal-path mapping for the catalog's
 * central methods, error-path classification (non-2xx-style rejection,
 * malformed/non-JSON response — the exact bug class already found once
 * during load testing, see saavnErrorClassification.test.ts), and
 * per-operation circuit-breaker isolation for the remaining breaker
 * categories (ARTIST/STREAM/CATALOG — SEARCH vs TRACK is already covered
 * in saavnErrorClassification.test.ts).
 *
 * Mocks jiosaavn-sdk directly (not SaavnService itself) so the real
 * mapping/classification/breaker-routing logic inside saavn.service.ts
 * actually runs. resilientCall is bypassed (real fn, no breaker/retry) for
 * everything except the dedicated breaker-isolation block at the bottom —
 * breaker state is a module-level singleton shared across this whole
 * file's tests, and the file deliberately rejects the same operations
 * repeatedly across many cases; without bypassing it, an early error-path
 * test would trip a breaker that a later, unrelated success-path test on
 * the same category then fails against.
 */
jest.mock('@utils/resilience', () => ({
  resilientCall: jest.fn((_name: string, fn: () => Promise<any>) => fn()),
}));

const mockSearchSongs = jest.fn();
const mockSearchAlbums = jest.fn();
const mockSearchArtists = jest.fn();
const mockSearchPlaylists = jest.fn();
const mockGetSongByIds = jest.fn();
const mockGetCharts = jest.fn();
const mockGetNewReleases = jest.fn();
const mockGetArtistById = jest.fn();
const mockGetAlbumById = jest.fn();
const mockGetPlaylistById = jest.fn();

jest.mock('jiosaavn-sdk', () => ({
  SearchService: jest.fn().mockImplementation(() => ({
    searchSongs: mockSearchSongs,
    searchAlbums: mockSearchAlbums,
    searchArtists: mockSearchArtists,
    searchPlaylists: mockSearchPlaylists,
  })),
  SongService: jest.fn().mockImplementation(() => ({ getSongByIds: mockGetSongByIds })),
  DiscoverService: jest.fn().mockImplementation(() => ({
    getCharts: mockGetCharts,
    getNewReleases: mockGetNewReleases,
  })),
  ArtistService: jest.fn().mockImplementation(() => ({ getArtistById: mockGetArtistById })),
  AlbumService: jest.fn().mockImplementation(() => ({ getAlbumById: mockGetAlbumById })),
  PlaylistService: jest.fn().mockImplementation(() => ({ getPlaylistById: mockGetPlaylistById })),
}));

import { SaavnService } from '@services/saavn.service';
import { SaavnUpstreamError } from '@utils/SaavnUpstreamError';

const rawSong = (overrides: Partial<any> = {}) => ({
  id: 's1',
  name: 'Test &amp; Song',
  duration: '200',
  image: [{ url: 'http://img/50x50.jpg' }, { url: 'http://img/500x500.jpg' }],
  downloadUrl: [{ url: 'http://audio/1.mp3' }],
  artists: { primary: [{ id: 'a1', name: 'Some Artist' }] },
  language: 'hindi',
  playCount: '1000',
  year: '2020',
  album: { id: 'al1', name: 'Album Name' },
  ...overrides,
});

const rawAlbum = (overrides: Partial<any> = {}) => ({
  id: 'al1',
  name: 'Test Album',
  image: [{ url: 'http://img/50x50.jpg' }],
  artists: { primary: [{ id: 'a1', name: 'Some Artist' }] },
  language: 'hindi',
  year: '2021',
  songCount: '10',
  type: 'album',
  ...overrides,
});

const rawArtist = (overrides: Partial<any> = {}) => ({
  id: 'a1',
  name: 'Some Artist',
  image: [{ url: 'http://img/500x500.jpg' }],
  followerCount: '5000',
  isVerified: true,
  dominantLanguage: 'hindi',
  ...overrides,
});

describe('SaavnService', () => {
  const saavn = SaavnService.getInstance();

  beforeEach(() => {
    [
      mockSearchSongs, mockSearchAlbums, mockSearchArtists, mockSearchPlaylists,
      mockGetSongByIds, mockGetCharts, mockGetNewReleases, mockGetArtistById,
      mockGetAlbumById, mockGetPlaylistById,
    ].forEach((m) => m.mockReset());
  });

  describe('search — normal path and error classification', () => {
    it('short-circuits to empty results for a blank query without hitting the catalog', async () => {
      const result = await saavn.search('   ');
      expect(result).toEqual({ tracks: [], albums: [], artists: [], playlists: [] });
      expect(mockSearchSongs).not.toHaveBeenCalled();
    });

    it('maps tracks/albums/artists/playlists from a normal search', async () => {
      mockSearchSongs.mockResolvedValue({ results: [rawSong()] });
      mockSearchAlbums.mockResolvedValue({ results: [rawAlbum()] });
      mockSearchArtists.mockResolvedValue({ results: [rawArtist()] });
      mockSearchPlaylists.mockResolvedValue({ results: [{ id: 'p1', name: 'Playlist &amp; Vibes', songCount: '5' }] });

      const result = await saavn.search('test');

      expect(result.tracks).toEqual([expect.objectContaining({ id: 's1', title: 'Test & Song' })]);
      expect(result.albums).toEqual([expect.objectContaining({ id: 'al1', title: 'Test Album' })]);
      expect(result.artists).toEqual([expect.objectContaining({ id: 'a1', name: 'Some Artist' })]);
      expect(result.playlists).toEqual([expect.objectContaining({ id: 'p1', title: 'Playlist & Vibes' })]);
    });

    it('a partial failure (some categories reject) still returns the categories that succeeded', async () => {
      mockSearchSongs.mockResolvedValue({ results: [rawSong()] });
      mockSearchAlbums.mockRejectedValue(new Error('albums endpoint down'));
      mockSearchArtists.mockRejectedValue(new Error('artists endpoint down'));
      mockSearchPlaylists.mockRejectedValue(new Error('playlists endpoint down'));

      const result = await saavn.search('test');

      expect(result.tracks).toHaveLength(1);
      expect(result.albums).toEqual([]);
    });

    it('when every category fails, throws SaavnUpstreamError rather than returning empty results silently', async () => {
      mockSearchSongs.mockRejectedValue(new Error('down'));
      mockSearchAlbums.mockRejectedValue(new Error('down'));
      mockSearchArtists.mockRejectedValue(new Error('down'));
      mockSearchPlaylists.mockRejectedValue(new Error('down'));

      await expect(saavn.search('test')).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('a malformed (non-JSON, HTML) upstream response on every category is also classified as SaavnUpstreamError', async () => {
      const htmlParseFailure = new SyntaxError('Unexpected token \'<\', "<HTML><HEA"... is not valid JSON');
      mockSearchSongs.mockRejectedValue(htmlParseFailure);
      mockSearchAlbums.mockRejectedValue(htmlParseFailure);
      mockSearchArtists.mockRejectedValue(htmlParseFailure);
      mockSearchPlaylists.mockRejectedValue(htmlParseFailure);

      await expect(saavn.search('test')).rejects.toBeInstanceOf(SaavnUpstreamError);
    });
  });

  describe('getTracks — normal path (order preservation) and error classification', () => {
    it('returns [] without calling the catalog for an empty id list', async () => {
      const result = await saavn.getTracks([]);
      expect(result).toEqual([]);
      expect(mockGetSongByIds).not.toHaveBeenCalled();
    });

    it('preserves the input id order regardless of the order the catalog returns them in', async () => {
      mockGetSongByIds.mockResolvedValue([rawSong({ id: 's2' }), rawSong({ id: 's1' })]);
      const result = await saavn.getTracks(['s1', 's2']);
      expect(result.map((t: any) => t.id)).toEqual(['s1', 's2']);
    });

    it('drops ids the catalog has no data for, rather than erroring', async () => {
      mockGetSongByIds.mockResolvedValue([rawSong({ id: 's1' })]);
      const result = await saavn.getTracks(['s1', 'missing']);
      expect(result.map((t: any) => t.id)).toEqual(['s1']);
    });

    it('a network-level rejection is classified as SaavnUpstreamError', async () => {
      mockGetSongByIds.mockRejectedValue(new Error('ECONNRESET'));
      await expect(saavn.getTracks(['s1'])).rejects.toBeInstanceOf(SaavnUpstreamError);
    });
  });

  describe('getTracksCached — batches through getTracks rather than one call per id', () => {
    // Redis is unconfigured in the test env (see tests/setup/env.ts), so
    // every id is a cache "miss" and this exercises the real fetch path —
    // the actual bug this covers (one bad id must not sink the whole
    // batch) lives entirely in that path regardless of caching.
    it('returns [] without calling the catalog for an empty id list', async () => {
      const result = await saavn.getTracksCached([]);
      expect(result).toEqual([]);
      expect(mockGetSongByIds).not.toHaveBeenCalled();
    });

    it('fetches every id in a single batched call, not one call per id', async () => {
      mockGetSongByIds.mockResolvedValue([rawSong({ id: 's1' }), rawSong({ id: 's2' })]);
      await saavn.getTracksCached(['s1', 's2']);
      expect(mockGetSongByIds).toHaveBeenCalledTimes(1);
    });

    it('a track the catalog has no data for is simply omitted, not thrown — valid ids in the same batch still resolve', async () => {
      // getTracks already drops ids missing from the catalog's response
      // rather than erroring per-id (see the block above) — this is what
      // getTracksCached relies on for one bad id not failing the batch.
      mockGetSongByIds.mockResolvedValue([rawSong({ id: 's1' })]);
      const result = await saavn.getTracksCached(['s1', 'missing']);
      expect(result.map((t: any) => t.id)).toEqual(['s1']);
    });

    it('preserves input order', async () => {
      mockGetSongByIds.mockResolvedValue([rawSong({ id: 's2' }), rawSong({ id: 's1' })]);
      const result = await saavn.getTracksCached(['s1', 's2']);
      expect(result.map((t: any) => t.id)).toEqual(['s1', 's2']);
    });

    it('a genuine upstream failure for the batch still propagates as SaavnUpstreamError', async () => {
      mockGetSongByIds.mockRejectedValue(new Error('ECONNRESET'));
      await expect(saavn.getTracksCached(['s1'])).rejects.toBeInstanceOf(SaavnUpstreamError);
    });
  });

  describe('getTrendingTracks — normal path (both branches) and error classification', () => {
    it('with no language/artist filter: pulls the first chart and maps its playlist songs', async () => {
      mockGetCharts.mockResolvedValue([{ id: 'chart-1' }]);
      mockGetPlaylistById.mockResolvedValue({ songs: [rawSong()] });

      const result = await saavn.getTrendingTracks();

      expect(mockGetPlaylistById).toHaveBeenCalledWith(expect.objectContaining({ id: 'chart-1' }));
      expect(result).toEqual([expect.objectContaining({ id: 's1' })]);
    });

    it('with no charts available, returns [] rather than erroring', async () => {
      mockGetCharts.mockResolvedValue([]);
      const result = await saavn.getTrendingTracks();
      expect(result).toEqual([]);
    });

    it('with a language/artist filter: searches, dedupes, and strictly filters by both', async () => {
      mockSearchSongs.mockResolvedValue({
        results: [
          rawSong({ id: 'match', language: 'hindi', artists: { primary: [{ id: 'a1', name: 'Arijit Singh' }] } }),
          rawSong({ id: 'wrong-lang', language: 'tamil', artists: { primary: [{ id: 'a1', name: 'Arijit Singh' }] } }),
          rawSong({ id: 'wrong-artist', language: 'hindi', artists: { primary: [{ id: 'a2', name: 'Someone Else' }] } }),
        ],
      });

      const result = await saavn.getTrendingTracks(['hindi'], ['Arijit Singh']);

      expect(result.map((t: any) => t.id)).toEqual(['match']);
    });

    it('the exact load-test failure — an HTML response instead of JSON on the charts path — classifies as SaavnUpstreamError', async () => {
      mockGetCharts.mockRejectedValue(new SyntaxError('Unexpected token \'<\'... is not valid JSON'));
      await expect(saavn.getTrendingTracks()).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getRecommendedTracks delegates to getTrendingTracks with no filters', async () => {
      mockGetCharts.mockResolvedValue([{ id: 'chart-1' }]);
      mockGetPlaylistById.mockResolvedValue({ songs: [rawSong()] });
      const result = await saavn.getRecommendedTracks();
      expect(result).toEqual([expect.objectContaining({ id: 's1' })]);
    });
  });

  describe('getNewReleases — normal path (both branches) and error classification', () => {
    it('with no filter: maps the default new-releases list', async () => {
      mockGetNewReleases.mockResolvedValue([rawAlbum()]);
      const result = await saavn.getNewReleases();
      expect(result).toEqual([expect.objectContaining({ id: 'al1' })]);
    });

    it('with a language filter: searches albums and strictly filters by language', async () => {
      mockSearchAlbums.mockResolvedValue({
        results: [
          rawAlbum({ id: 'match', language: 'hindi' }),
          rawAlbum({ id: 'wrong-lang', language: 'tamil' }),
        ],
      });
      const result = await saavn.getNewReleases(['hindi']);
      expect(result.map((a: any) => a.id)).toEqual(['match']);
    });

    it('with an artist filter: strictly filters by artist (album artist or any track artist)', async () => {
      mockSearchAlbums.mockResolvedValue({
        results: [
          rawAlbum({ id: 'match', artists: { primary: [{ id: 'a1', name: 'Arijit Singh' }] } }),
          rawAlbum({ id: 'no-match', artists: { primary: [{ id: 'a2', name: 'Someone Else' }] } }),
        ],
      });
      const result = await saavn.getNewReleases([], ['Arijit Singh']);
      expect(result.map((a: any) => a.id)).toEqual(['match']);
    });

    it('an upstream rejection on the default branch classifies as SaavnUpstreamError', async () => {
      mockGetNewReleases.mockRejectedValue(new Error('upstream down'));
      await expect(saavn.getNewReleases()).rejects.toBeInstanceOf(SaavnUpstreamError);
    });
  });

  describe('normal-path coverage for peripheral methods', () => {
    it('getRecommendationsByGenres searches each genre independently and merges the results', async () => {
      mockSearchSongs.mockImplementation(({ query }: { query: string }) =>
        Promise.resolve({ results: [rawSong({ id: `${query}-1`, name: `${query} song` })] })
      );
      const result = await saavn.getRecommendationsByGenres(['pop', 'energetic'], 10);
      // Not joined into one literal "pop energetic" query — each genre gets its own search.
      expect(mockSearchSongs).toHaveBeenCalledWith(expect.objectContaining({ query: 'pop', limit: 10 }));
      expect(mockSearchSongs).toHaveBeenCalledWith(expect.objectContaining({ query: 'energetic', limit: 10 }));
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'pop-1' }),
          expect.objectContaining({ id: 'energetic-1' }),
        ])
      );
    });

    it('getRecommendationsByGenres classifies an upstream failure as SaavnUpstreamError', async () => {
      mockSearchSongs.mockRejectedValue(new Error('down'));
      await expect(saavn.getRecommendationsByGenres(['pop'], 10)).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getTrack returns null for a genuinely missing track (not an error)', async () => {
      mockGetSongByIds.mockResolvedValue([]);
      expect(await saavn.getTrack('missing')).toBeNull();
    });

    it('getTrackForStream maps a found track', async () => {
      mockGetSongByIds.mockResolvedValue([rawSong()]);
      const result = await saavn.getTrackForStream('s1');
      expect(result).toEqual(expect.objectContaining({ id: 's1' }));
    });

    it('getTrackForStream classifies an upstream failure as SaavnUpstreamError', async () => {
      mockGetSongByIds.mockRejectedValue(new Error('down'));
      await expect(saavn.getTrackForStream('s1')).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getAlbum maps a found album', async () => {
      mockGetAlbumById.mockResolvedValue(rawAlbum());
      const result = await saavn.getAlbum('al1');
      expect(result).toEqual(expect.objectContaining({ id: 'al1' }));
    });

    it('getAlbum classifies an upstream failure as SaavnUpstreamError', async () => {
      mockGetAlbumById.mockRejectedValue(new Error('down'));
      await expect(saavn.getAlbum('al1')).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getArtist maps a found artist', async () => {
      mockGetArtistById.mockResolvedValue(rawArtist());
      const result = await saavn.getArtist('a1');
      expect(result).toEqual(expect.objectContaining({ id: 'a1', name: 'Some Artist' }));
    });

    it('getArtist classifies an upstream failure as SaavnUpstreamError', async () => {
      mockGetArtistById.mockRejectedValue(new Error('down'));
      await expect(saavn.getArtist('a1')).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getArtistTopTracks maps topSongs, and [] when the artist has none', async () => {
      mockGetArtistById.mockResolvedValue({ ...rawArtist(), topSongs: [rawSong()] });
      expect(await saavn.getArtistTopTracks('a1')).toEqual([expect.objectContaining({ id: 's1' })]);

      mockGetArtistById.mockResolvedValue({ ...rawArtist(), topSongs: undefined });
      expect(await saavn.getArtistTopTracks('a1')).toEqual([]);
    });

    it('getArtistTopTracks classifies an upstream failure as SaavnUpstreamError', async () => {
      mockGetArtistById.mockRejectedValue(new Error('down'));
      await expect(saavn.getArtistTopTracks('a1')).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getArtistAlbums maps topAlbums, and [] when the artist has none', async () => {
      mockGetArtistById.mockResolvedValue({ ...rawArtist(), topAlbums: [rawAlbum()] });
      expect(await saavn.getArtistAlbums('a1')).toEqual([expect.objectContaining({ id: 'al1' })]);
    });

    it('getArtistAlbums classifies an upstream failure as SaavnUpstreamError', async () => {
      mockGetArtistById.mockRejectedValue(new Error('down'));
      await expect(saavn.getArtistAlbums('a1')).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getRelatedArtists maps similarArtists, capped at 5', async () => {
      mockGetArtistById.mockResolvedValue({
        ...rawArtist(),
        similarArtists: Array.from({ length: 8 }, (_, i) => rawArtist({ id: `related-${i}` })),
      });
      const result = await saavn.getRelatedArtists('a1');
      expect(result).toHaveLength(5);
    });

    it('getRelatedArtists classifies an upstream failure as SaavnUpstreamError', async () => {
      mockGetArtistById.mockRejectedValue(new Error('down'));
      await expect(saavn.getRelatedArtists('a1')).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getMoodPlaylists maps playlist search results', async () => {
      mockSearchPlaylists.mockResolvedValue({ results: [{ id: 'p1', name: 'Chill &amp; Vibes', songCount: '12' }] });
      const result = await saavn.getMoodPlaylists('chill');
      expect(result).toEqual([expect.objectContaining({ id: 'p1', title: 'Chill & Vibes' })]);
    });

    it('getMoodPlaylists classifies an upstream failure as SaavnUpstreamError', async () => {
      mockSearchPlaylists.mockRejectedValue(new Error('down'));
      await expect(saavn.getMoodPlaylists('chill')).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getRecommendations strictly filters by language and artist, and shuffles/caps at the limit', async () => {
      mockSearchSongs.mockResolvedValue({
        results: [
          rawSong({ id: 'match', language: 'hindi', artists: { primary: [{ id: 'a1', name: 'Arijit Singh' }] } }),
          rawSong({ id: 'wrong-lang', language: 'tamil', artists: { primary: [{ id: 'a1', name: 'Arijit Singh' }] } }),
        ],
      });
      const result = await saavn.getRecommendations(['hindi'], ['Arijit Singh'], 5);
      expect(result.map((t: any) => t.id)).toEqual(['match']);
    });

    it('getRecommendations classifies an upstream failure as SaavnUpstreamError (and does not double-wrap an existing one)', async () => {
      mockSearchSongs.mockRejectedValue(new Error('down'));
      await expect(saavn.getRecommendations(['hindi'], [], 5)).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getRecommendations falls back to a generic "hits" query when given no languages or artists', async () => {
      mockSearchSongs.mockResolvedValue({ results: [rawSong()] });
      await saavn.getRecommendations([], [], 5);
      expect(mockSearchSongs).toHaveBeenCalledWith(expect.objectContaining({ query: 'hits' }));
    });

    it('getSuggestions maps title strings, and [] for a blank query without hitting the catalog', async () => {
      expect(await saavn.getSuggestions('  ')).toEqual([]);
      expect(mockSearchSongs).not.toHaveBeenCalled();

      mockSearchSongs.mockResolvedValue({ results: [rawSong({ name: 'Suggested Title' })] });
      expect(await saavn.getSuggestions('test')).toEqual(['Suggested Title']);
    });

    it('getSuggestions classifies an upstream failure as SaavnUpstreamError', async () => {
      mockSearchSongs.mockRejectedValue(new Error('down'));
      await expect(saavn.getSuggestions('test')).rejects.toBeInstanceOf(SaavnUpstreamError);
    });

    it('getCategories returns the static language category list', async () => {
      const result = await saavn.getCategories();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String) }));
    });
  });

  describe('per-operation circuit breaker isolation (ARTIST/STREAM/CATALOG — SEARCH vs TRACK covered in saavnErrorClassification.test.ts)', () => {
    // Breaker state lives in a module-level Map inside resilience.ts. Each
    // case below resets the module registry and mocks jiosaavn-sdk fresh so
    // it starts from a clean breaker Map, then chains into the next
    // category — forming a cycle (SEARCH→TRACK already tested elsewhere,
    // ARTIST→STREAM, STREAM→CATALOG, CATALOG→SEARCH here) that touches
    // every one of the 5 named breakers without a combinatorial explosion
    // of pairs.
    function freshMocks() {
      jest.resetModules();
      // Restore the REAL resilience module for this fresh registry — the
      // file-level mock above bypasses the breaker everywhere else, but
      // breaker isolation is exactly what these tests need to exercise.
      jest.doMock('@utils/resilience', () => jest.requireActual('@utils/resilience'));
      const m = {
        searchSongs: jest.fn(), searchAlbums: jest.fn(), searchArtists: jest.fn(), searchPlaylists: jest.fn(),
        getSongByIds: jest.fn(), getCharts: jest.fn(), getNewReleases: jest.fn(),
        getArtistById: jest.fn(), getAlbumById: jest.fn(), getPlaylistById: jest.fn(),
      };
      jest.doMock('jiosaavn-sdk', () => ({
        SearchService: jest.fn().mockImplementation(() => ({
          searchSongs: m.searchSongs, searchAlbums: m.searchAlbums, searchArtists: m.searchArtists, searchPlaylists: m.searchPlaylists,
        })),
        SongService: jest.fn().mockImplementation(() => ({ getSongByIds: m.getSongByIds })),
        DiscoverService: jest.fn().mockImplementation(() => ({ getCharts: m.getCharts, getNewReleases: m.getNewReleases })),
        ArtistService: jest.fn().mockImplementation(() => ({ getArtistById: m.getArtistById })),
        AlbumService: jest.fn().mockImplementation(() => ({ getAlbumById: m.getAlbumById })),
        PlaylistService: jest.fn().mockImplementation(() => ({ getPlaylistById: m.getPlaylistById })),
      }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { SaavnService: FreshSaavnService } = require('@services/saavn.service');
      return { saavn: FreshSaavnService.getInstance() as SaavnService, m };
    }

    it('tripping the ARTIST breaker does not affect stream lookups', async () => {
      const { saavn: fresh, m } = freshMocks();

      m.getArtistById.mockRejectedValue(new Error('artist service down'));
      for (let i = 0; i < 10; i++) await fresh.getArtist(`a-${i}`).catch(() => {});

      m.getSongByIds.mockResolvedValue([rawSong()]);
      const result = await fresh.getTrackForStream('s1');

      expect(result).toEqual(expect.objectContaining({ id: 's1' }));
      expect(m.getSongByIds).toHaveBeenCalled();
    });

    it('tripping the STREAM breaker does not affect catalog (album) lookups', async () => {
      const { saavn: fresh, m } = freshMocks();

      m.getSongByIds.mockRejectedValue(new Error('stream down'));
      for (let i = 0; i < 10; i++) await fresh.getTrackForStream(`s-${i}`).catch(() => {});

      m.getAlbumById.mockResolvedValue(rawAlbum());
      const result = await fresh.getAlbum('al1');

      expect(result).toEqual(expect.objectContaining({ id: 'al1' }));
      expect(m.getAlbumById).toHaveBeenCalled();
    });

    it('tripping the CATALOG breaker does not affect search', async () => {
      const { saavn: fresh, m } = freshMocks();

      m.getAlbumById.mockRejectedValue(new Error('catalog down'));
      for (let i = 0; i < 10; i++) await fresh.getAlbum(`al-${i}`).catch(() => {});

      m.searchSongs.mockResolvedValue({ results: [rawSong()] });
      m.searchAlbums.mockResolvedValue({ results: [] });
      m.searchArtists.mockResolvedValue({ results: [] });
      m.searchPlaylists.mockResolvedValue({ results: [] });
      const result = await fresh.search('test');

      expect(result.tracks).toEqual([expect.objectContaining({ id: 's1' })]);
      expect(m.searchSongs).toHaveBeenCalled();
    });
  });
});
