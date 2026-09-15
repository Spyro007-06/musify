/**
 * Unit tests for SaavnService's error classification (Step 1 of the
 * post-load-test cleanup): a genuine "not found" (call succeeded, no data)
 * must stay distinct from an upstream failure (network error, timeout, or
 * — the exact failure the load test hit — an HTML/non-JSON response from a
 * rate-limited or blocked upstream).
 *
 * Mocks jiosaavn-sdk directly (not SaavnService itself) so we can exercise
 * the real classification logic inside saavn.service.ts.
 */
const mockGetSongByIds = jest.fn();
const mockSearchSongs = jest.fn();

jest.mock('jiosaavn-sdk', () => ({
  SearchService: jest.fn().mockImplementation(() => ({
    searchSongs: mockSearchSongs,
    searchAlbums: jest.fn(),
    searchArtists: jest.fn(),
    searchPlaylists: jest.fn(),
  })),
  SongService: jest.fn().mockImplementation(() => ({ getSongByIds: mockGetSongByIds })),
  DiscoverService: jest.fn().mockImplementation(() => ({})),
  ArtistService: jest.fn().mockImplementation(() => ({})),
  AlbumService: jest.fn().mockImplementation(() => ({})),
  PlaylistService: jest.fn().mockImplementation(() => ({})),
}));

import { SaavnService } from '@services/saavn.service';
import { SaavnUpstreamError } from '@utils/SaavnUpstreamError';

describe('SaavnService error classification', () => {
  const saavn = SaavnService.getInstance();

  beforeEach(() => {
    mockGetSongByIds.mockReset();
    mockSearchSongs.mockReset();
  });

  it('a genuinely empty result (call succeeded, no song) resolves to null — not an error', async () => {
    mockGetSongByIds.mockResolvedValue([]);
    const result = await saavn.getTrack('does-not-exist');
    expect(result).toBeNull();
  });

  it('the exact failure the load test hit — an HTML response instead of JSON — is classified as SaavnUpstreamError, not treated as "not found"', async () => {
    // This is what actually happened against the live JioSaavn API when
    // this sandbox's IP got rate-limited: the SDK's fetch tries to
    // JSON.parse an HTML block/error page.
    mockGetSongByIds.mockRejectedValue(new SyntaxError('Unexpected token \'<\', "<HTML><HEA"... is not valid JSON'));

    await expect(saavn.getTrack('some-id')).rejects.toBeInstanceOf(SaavnUpstreamError);
  });

  it('a network-level rejection is also classified as SaavnUpstreamError', async () => {
    mockGetSongByIds.mockRejectedValue(new Error('ECONNRESET'));
    await expect(saavn.getTrack('some-id')).rejects.toBeInstanceOf(SaavnUpstreamError);
  });

  it('search: if every category fails, throws SaavnUpstreamError', async () => {
    mockSearchSongs.mockRejectedValue(new Error('upstream down'));
    await expect(saavn.getSuggestions('test query')).rejects.toBeInstanceOf(SaavnUpstreamError);
  });
});

describe('SaavnService per-operation circuit breaker isolation', () => {
  // Breaker state lives in a module-level Map inside resilience.ts, shared
  // for the lifetime of this test file's module registry — the classification
  // tests above already put a couple of failures through the TRACK breaker.
  // Reset modules and re-require fresh copies of everything (including a
  // clean breaker Map) so this test starts from a known state instead of
  // inheriting failure counts from unrelated tests.
  beforeAll(() => {
    jest.resetModules();
  });

  it('tripping the search breaker does not affect track lookups', async () => {
    const freshMockGetSongByIds = jest.fn();
    const freshMockSearchSongs = jest.fn();

    jest.doMock('jiosaavn-sdk', () => ({
      SearchService: jest.fn().mockImplementation(() => ({
        searchSongs: freshMockSearchSongs,
        searchAlbums: jest.fn(),
        searchArtists: jest.fn(),
        searchPlaylists: jest.fn(),
      })),
      SongService: jest.fn().mockImplementation(() => ({ getSongByIds: freshMockGetSongByIds })),
      DiscoverService: jest.fn().mockImplementation(() => ({})),
      ArtistService: jest.fn().mockImplementation(() => ({})),
      AlbumService: jest.fn().mockImplementation(() => ({})),
      PlaylistService: jest.fn().mockImplementation(() => ({})),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SaavnService: FreshSaavnService } = require('@services/saavn.service');
    const freshSaavn = FreshSaavnService.getInstance();

    // Trip the search breaker with enough failures within its rolling window.
    freshMockSearchSongs.mockRejectedValue(new Error('search is down'));
    for (let i = 0; i < 10; i++) {
      await freshSaavn.getSuggestions(`query-${i}`).catch(() => {});
    }

    // Track lookup uses a different breaker (SAAVN_BREAKER.TRACK) and a
    // healthy underlying call — it should succeed normally, not fail fast
    // because search's breaker is open.
    freshMockGetSongByIds.mockResolvedValue([{ id: 'track-1', name: 'Song' }]);
    const result = await freshSaavn.getTrack('track-1');

    expect(result).toEqual(expect.objectContaining({ id: 'track-1' }));
    expect(freshMockGetSongByIds).toHaveBeenCalled(); // confirms it actually attempted the call, not failed fast
  });
});
