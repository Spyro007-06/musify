'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart, Music } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Track } from '@/types/track';
import { Playlist } from '@/types/playlist';
import { Album } from '@/types/album';

interface Shortcut {
  key: string;
  title: string;
  cover?: string | null;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export interface ShortcutGridProps {
  hasLibrary: boolean;
  playlists: Playlist[];
  recentAlbums: Album[];
  recentTracks: Track[];
  fallbackTracks: Track[];
  onPlayTrack: (track: Track, queue: Track[]) => void;
}

/**
 * Spotify-style grid of go-to items at the top of Home: Liked Songs, your
 * playlists, albums you've been playing, then recent songs. Guests get the
 * top trending songs instead.
 */
export function ShortcutGrid({ hasLibrary, playlists, recentAlbums, recentTracks, fallbackTracks, onPlayTrack }: ShortcutGridProps) {
  const items: Shortcut[] = [];
  if (hasLibrary) {
    items.push({ key: 'liked', title: 'Liked Songs', href: '/library/liked', icon: <Heart className="h-5 w-5 fill-current text-white" /> });
    playlists.slice(0, 2).forEach((p) => items.push({ key: `p-${p.id}`, title: p.title, cover: p.cover, href: `/playlists/${p.id}` }));
    recentAlbums.slice(0, 3).forEach((a) => items.push({ key: `a-${a.id}`, title: a.title, cover: a.artwork, href: `/albums/${a.id}` }));
  }
  const songs = hasLibrary && recentTracks.length > 0 ? recentTracks : fallbackTracks;
  const shownAlbums = new Set(recentAlbums.slice(0, 3).map((a) => a.id));
  for (const t of songs) {
    if (items.length >= 8) break;
    if (t.album?.id && shownAlbums.has(t.album.id)) continue;
    items.push({ key: `t-${t.id}`, title: t.title, cover: t.artwork, onClick: () => onPlayTrack(t, songs) });
  }

  if (items.length === 0) return null;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {items.slice(0, 8).map((item) => {
        const body = (
          <>
            <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-gradient-to-br from-indigo-600 to-brand-500 flex items-center justify-center">
              {item.icon ?? (
                <ImageWithFallback
                  src={item.cover}
                  alt=""
                  fallbackIcon={<Music className="h-5 w-5 text-neutral-500" />}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              )}
            </div>
            <span className="line-clamp-2 pr-2 text-left text-xs sm:text-sm font-semibold text-white">{item.title}</span>
          </>
        );
        const className =
          'flex items-center gap-3 overflow-hidden rounded-md bg-white/[0.07] hover:bg-white/[0.12] active:bg-white/[0.15] transition-colors';
        return item.href ? (
          <Link key={item.key} href={item.href} className={className}>
            {body}
          </Link>
        ) : (
          <button key={item.key} type="button" onClick={item.onClick} className={className}>
            {body}
          </button>
        );
      })}
    </section>
  );
}
