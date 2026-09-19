'use client';

import * as React from 'react';
import Link from 'next/link';
import { Category } from '@/types/category';
import { cn } from '@/lib/utils/cn';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Compass } from 'lucide-react';

export interface CategoryCardProps {
  category: Category;
  className?: string;
}

// Fallback gradient map for known genres/slugs
const GRADIENTS: Record<string, string> = {
  hindi: 'from-indigo-600 via-indigo-900 to-black',
  punjabi: 'from-emerald-600 via-teal-900 to-black',
  tamil: 'from-rose-600 via-pink-900 to-black',
  english: 'from-blue-600 via-sky-900 to-black',
  pop: 'from-accent-600 via-fuchsia-900 to-black',
  rock: 'from-amber-600 via-orange-900 to-black',
  electronic: 'from-cyan-600 via-blue-900 to-black',
  hiphop: 'from-red-600 via-red-950 to-black',
  chill: 'from-teal-600 via-emerald-950 to-black',
};

export function CategoryCard({ category, className }: CategoryCardProps) {
  const coverSrc = category.coverUrl || category.cover;
  const gradientClass =
    category.gradient ||
    GRADIENTS[category.slug || category.id?.toLowerCase()] ||
    'from-neutral-800 to-neutral-950';

  const href = `/browse?genre=${encodeURIComponent(category.slug || category.id)}`;

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex h-32 w-full overflow-hidden rounded-xl p-4 transition-all duration-300',
        'hover:scale-[1.03] hover:shadow-lg hover:shadow-black/50 border border-white/5 select-none',
        'bg-gradient-to-br',
        gradientClass,
        className
      )}
    >
      {/* Category Title */}
      <div className="z-10 max-w-[65%]">
        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug group-hover:text-white">
          {category.name}
        </h3>
      </div>

      {/* Decorative Cover Image / Icon angled at bottom right */}
      <div className="absolute -bottom-2 -right-3 h-20 w-20 rotate-[22deg] overflow-hidden rounded-md shadow-2xl transition-transform duration-300 group-hover:rotate-[28deg] group-hover:scale-110">
        <ImageWithFallback
          src={coverSrc}
          alt={category.name}
          fallbackIcon={<Compass className="h-8 w-8 text-white/40" />}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
    </Link>
  );
}
