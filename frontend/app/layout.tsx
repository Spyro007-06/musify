import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';
import { Analytics } from '@vercel/analytics/next';

const bodyFont = localFont({
  src: '../public/fonts/dm-sans-variable.ttf',
  variable: '--font-body',
  weight: '100 1000',
  display: 'swap',
});
const displayFont = localFont({
  src: '../public/fonts/space-grotesk-variable.ttf',
  variable: '--font-display',
  weight: '300 700',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MUSIFY - Music Streaming',
  description: 'Stream music, discover artists, and enjoy personalized playlists.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/brand/musify-mark.png', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MUSIFY',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b1210',
  // Lets the installed iPhone app draw under the notch/home bar (statusBarStyle is
  // black-translucent); the header, player and nav pad themselves with safe-area insets.
  viewportFit: 'cover',
};

// iOS home-screen apps (navigator.standalone) with the black-translucent
// status bar draw from the top of the screen, but WebKit sizes the viewport
// as if the status bar weren't there, so 100dvh and bottom:0 stop that much
// short. A standalone app always fills the screen, so any shortfall is that
// bug; store it in --ios-gap (see globals.css). Measured, not assumed, so it
// stays 0 if Apple fixes it. Bigger changes (keyboard) are ignored.
const IOS_GAP_SCRIPT = `(function(){
  if (!navigator.standalone) return;
  function measure() {
    var s = screen, landscape = matchMedia('(orientation: landscape)').matches;
    var gap = (landscape ? Math.min(s.width, s.height) : Math.max(s.width, s.height)) - innerHeight;
    if (gap >= 0 && gap < 120) document.documentElement.style.setProperty('--ios-gap', gap + 'px');
  }
  measure();
  addEventListener('resize', measure);
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${bodyFont.variable} ${displayFont.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: IOS_GAP_SCRIPT }} />
      </head>
      <body className="bg-canvas font-sans text-neutral-50 antialiased">
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
