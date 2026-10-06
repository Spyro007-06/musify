import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    // The installed app's identity on Android. It was the start_url until now,
    // so it stays '/home': a different id makes phones see a new app.
    id: '/home',
    name: 'MUSIFY - Music Streaming',
    short_name: 'MUSIFY',
    description: 'Stream music, discover artists, and enjoy personalized playlists.',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    lang: 'en',
    categories: ['music', 'entertainment'],
    background_color: '#0a0a0a',
    theme_color: '#0b1210', // the page's themeColor (app/layout.tsx), so the title bar doesn't change on launch
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
