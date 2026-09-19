import Image from 'next/image';
import { cn } from '@/lib/utils/cn';

/** Shared lockup; the decorative mark is labelled by the visible wordmark. */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/brand/musify-mark.png"
        alt=""
        width={44}
        height={44}
        className="shrink-0 rounded-xl"
      />
      <span className="brand-wordmark text-2xl leading-none text-neutral-50">musify<span className="text-brand-400">.</span></span>
    </span>
  );
}
