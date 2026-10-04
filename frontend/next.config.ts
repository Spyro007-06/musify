import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Vercel Hobby caps image transformations at 5K/month and pauses the team
    // when exceeded. Serve images as-is (JioSaavn's CDN already has sizes).
    unoptimized: true,
    // If optimization is ever turned back on, only the catalog's artwork hosts
    // may go through it, so /_next/image can't be used as an open image proxy.
    remotePatterns: ['**.saavncdn.com', 'www.jiosaavn.com', 'images.unsplash.com'].map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
