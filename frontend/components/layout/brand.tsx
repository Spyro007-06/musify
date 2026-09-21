import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

export interface BrandProps {
  className?: string;
  /** 'sm' fits tight spaces like the mobile topbar; 'default' is the sidebar lockup; 'lg' is the boot splash. */
  size?: 'default' | 'sm' | 'lg';
}

const MARK_SIZES = { sm: 28, default: 44, lg: 56 };
const WORDMARK_CLASSES = { sm: 'text-lg', default: 'text-2xl', lg: 'text-3xl' };

/** Shared lockup; the decorative mark is labelled by the visible wordmark. */
export function Brand({ className, size = 'default' }: BrandProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/brand/musify-mark.png"
        alt=""
        width={MARK_SIZES[size]}
        height={MARK_SIZES[size]}
        className="shrink-0 rounded-xl"
      />
      <span className={cn('brand-wordmark leading-none text-neutral-50', WORDMARK_CLASSES[size])}>
        musify<span className="text-brand-400">.</span>
      </span>
    </span>
  );
}
