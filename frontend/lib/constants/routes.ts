export const ROUTES = {
  MARKETING: '/',
  AUTH: {
    LOGIN: '/login',
    SIGNUP: '/signup',
  },
  APP: {
    HOME: '/home',
    SEARCH: '/search',
    DISCOVER: '/discover',
    BROWSE: '/browse',
    LIBRARY: {
      INDEX: '/library',
      LIKED: '/library/liked',
      RECENTLY_PLAYED: '/library/recently-played',
      PLAYLISTS: '/library/playlists',
    },
    ARTIST: (id: string) => `/artists/${id}`,
    ALBUM: (id: string) => `/albums/${id}`,
    PLAYLIST: (id: string) => `/playlists/${id}`,
    AI: {
      INDEX: '/ai',
      PLAYLIST: '/ai/playlist',
    },
    PROFILE: '/profile',
    SETTINGS: '/settings',
  },
} as const;
