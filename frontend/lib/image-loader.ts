'use client';

/**
 * next/image loader with no server-side optimization (Vercel Hobby caps it):
 * picks the smallest size the source CDN already serves, so a 44px thumbnail
 * doesn't download a 500x500 cover. Also upgrades http artwork to https
 * (JioSaavn sometimes returns http, which an https page can't always load).
 */
export default function imageLoader({ src, width }: { src: string; width: number }): string {
  const url = src.replace(/^http:\/\//, 'https://');
  if (url.includes('saavncdn.com')) {
    const size = width <= 50 ? 50 : width <= 150 ? 150 : 500;
    return url.replace(/\b(50x50|150x150|500x500)\b/, `${size}x${size}`);
  }
  if (url.startsWith('https://images.unsplash.com/')) {
    const u = new URL(url);
    u.searchParams.set('w', String(width));
    return u.toString();
  }
  return url;
}
