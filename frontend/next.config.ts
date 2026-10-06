import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Vercel Hobby caps image transformations at 5K/month and pauses the team
    // when exceeded. The loader picks from the sizes JioSaavn's CDN already has.
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    // If optimization is ever turned back on, only the catalog's artwork hosts
    // may go through it, so /_next/image can't be used as an open image proxy.
    remotePatterns: ['**.saavncdn.com', 'www.jiosaavn.com', 'images.unsplash.com'].map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
  },
  // Baseline security headers (site reputation scanners check for these).
  // Permissions-Policy turns off device features the app never uses;
  // clipboard and Web Share, which it does use, are left alone.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        ],
      },
    ];
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
