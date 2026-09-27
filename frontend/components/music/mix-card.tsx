'use client';

import * as React from 'react';
import { Play, Radio } from 'lucide-react';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';

export interface MixCardProps {
  title: string;
  subtitle: string;
  cover?: string | null;
  badge: string;
  onPlay: () => void;
}

/** Tap-to-play card for an artist station or mix (no detail page behind it). */
export function MixCard({ title, subtitle, cover, badge, onPlay }: MixCardProps) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play ${title}`}
      className="group flex w-full flex-col rounded-xl bg-neutral-900/40 p-3 text-left border border-white/5 hover:border-white/10 transition-colors"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-800">
        <ImageWithFallback
          src={cover}
          alt=""
          fallbackIcon={<Radio className="h-1/3 w-1/3 text-neutral-600" />}
          fill
          sizes="170px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-white">
          {badge}
        </span>
        <span className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="h-4 w-4 fill-current ml-0.5" />
        </span>
      </div>
      <h4 className="mt-3 truncate text-sm font-semibold text-white">{title}</h4>
      <p className="mt-0.5 line-clamp-2 text-xs text-neutral-400">{subtitle}</p>
    </button>
  );
}
