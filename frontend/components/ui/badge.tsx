import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variant === 'default' && 'bg-white text-black',
        variant === 'secondary' && 'bg-neutral-800 text-neutral-300',
        variant === 'outline' && 'border border-neutral-700 text-neutral-300',
        variant === 'success' && 'bg-brand-900/60 text-brand-400 border border-brand-700',
        className
      )}
      {...props}
    />
  );
}
