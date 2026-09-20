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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${bodyFont.variable} ${displayFont.variable}`}>
      <body className="bg-canvas font-sans text-neutral-50 antialiased">
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
