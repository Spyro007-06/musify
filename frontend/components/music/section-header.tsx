import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, seeAllHref, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-4', className)}>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-neutral-400 mt-1">{subtitle}</p>}
      </div>
      {seeAllHref && (
        <Link href={seeAllHref} className="shrink-0 text-sm font-semibold text-brand-300 hover:text-brand-200">
          See all
        </Link>
      )}
    </div>
  );
}
