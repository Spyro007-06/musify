import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

export interface BrandProps {
  className?: string;
  /** 'sm' fits tight spaces like the mobile topbar; 'default' is the sidebar lockup. */
  size?: 'default' | 'sm';
}

/** Shared lockup; the decorative mark is labelled by the visible wordmark. */
export function Brand({ className, size = 'default' }: BrandProps) {
  const markSize = size === 'sm' ? 28 : 44;

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/brand/musify-mark.png"
        alt=""
        width={markSize}
        height={markSize}
        className="shrink-0 rounded-xl"
      />
      <span
        className={cn(
          'brand-wordmark leading-none text-neutral-50',
          size === 'sm' ? 'text-lg' : 'text-2xl'
        )}
      >
        musify<span className="text-brand-400">.</span>
      </span>
    </span>
  );
}
