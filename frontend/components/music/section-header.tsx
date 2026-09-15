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
    <div className={cn('flex items-end justify-between mb-4', className)}>
      <div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
      </div>
      {seeAllHref && (
        <Link href={seeAllHref} className="text-xs font-semibold text-neutral-400 hover:text-white">
          See all
        </Link>
      )}
    </div>
  );
}
