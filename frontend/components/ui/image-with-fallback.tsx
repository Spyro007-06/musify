'use client';

import * as React from 'react';
import Image, { ImageProps } from 'next/image';
import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ImageWithFallbackProps extends Omit<ImageProps, 'src'> {
  src?: string | null;
  fallbackIcon?: React.ReactNode;
  fallbackClassName?: string;
}

export function ImageWithFallback({
  src,
  alt,
  fallbackIcon,
  fallbackClassName,
  className,
  ...props
}: ImageWithFallbackProps) {
  const [error, setError] = React.useState(false);

  // Reset error if src changes
  React.useEffect(() => {
    setError(false);
  }, [src]);

  // next/image throws (crashing the whole page) on anything that isn't an
  // absolute URL or root-relative path — and JioSaavn occasionally returns
  // junk like an HTML error page as an image URL.
  // (data: URLs are legit — uploaded avatars are stored that way.)
  const isUsableSrc = !!src && (src.startsWith('/') || /^(https?:\/\/|data:image\/)/.test(src));

  if (!isUsableSrc || error) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-neutral-800 text-neutral-500',
          fallbackClassName,
          className
        )}
        aria-label={alt}
      >
        {fallbackIcon || <Music2 className="h-1/3 w-1/3 stroke-[1.5] text-neutral-600" />}
      </div>
    );
  }

  return (
    <Image
      src={src!}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
}
