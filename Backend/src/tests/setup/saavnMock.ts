/**
 * Mocks the SaavnService singleton so tests never make a real network call
 * to the external JioSaavn API. NOT registered globally (unlike
 * prismaMock/supabaseMock) — import this explicitly, and as the FIRST
 * import in the file, before `../../app` or any service that constructs
 * `SaavnService.getInstance()` at module-load time:
 *
 *   import '../setup/saavnMock';
 *   import request from 'supertest';
 *   import app from '../../app';
 *   import { saavnMock } from '../setup/saavnMock';
 *
 * A test configures behavior via the exported jest.fn()s, e.g.:
 *   saavnMock.getTrack.mockResolvedValue({ id: 't1', title: 'Song' });
 */
jest.mock('@services/saavn.service', () => {
  const instance = {
    getTrendingTracks: jest.fn(),
    getNewReleases: jest.fn(),
    getRecommendedTracks: jest.fn(),
    getRecommendationsByGenres: jest.fn(),
    getTrack: jest.fn(),
    getTracks: jest.fn(),
    getTracksCached: jest.fn(),
    getTrackForStream: jest.fn(),
    getAlbum: jest.fn(),
    getArtist: jest.fn(),
    getArtistTopTracks: jest.fn(),
    getArtistAlbums: jest.fn(),
    getRelatedArtists: jest.fn(),
    getCategories: jest.fn(),
    getMoodPlaylists: jest.fn(),
    search: jest.fn(),
    getRecommendations: jest.fn(),
    getSuggestions: jest.fn(),
  };
  return {
    __esModule: true,
    SaavnService: { getInstance: jest.fn(() => instance) },
  };
});

const { SaavnService } = require('@services/saavn.service');

export const saavnMock = SaavnService.getInstance() as {
  getTrendingTracks: jest.Mock;
  getNewReleases: jest.Mock;
  getRecommendedTracks: jest.Mock;
  getRecommendationsByGenres: jest.Mock;
  getTrack: jest.Mock;
  getTracks: jest.Mock;
  getTracksCached: jest.Mock;
  getTrackForStream: jest.Mock;
  getAlbum: jest.Mock;
  getArtist: jest.Mock;
  getArtistTopTracks: jest.Mock;
  getArtistAlbums: jest.Mock;
  getRelatedArtists: jest.Mock;
  getCategories: jest.Mock;
  getMoodPlaylists: jest.Mock;
  search: jest.Mock;
  getRecommendations: jest.Mock;
  getSuggestions: jest.Mock;
};

beforeEach(() => {
  Object.values(saavnMock).forEach((fn) => fn.mockReset());
});
