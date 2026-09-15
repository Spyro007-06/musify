import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';

export const metadata: Metadata = {
  title: 'MUSIFY - Music Streaming',
  description: 'Stream music, discover artists, and enjoy personalized playlists.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
