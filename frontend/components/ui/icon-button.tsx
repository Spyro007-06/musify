import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'filled';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', variant = 'ghost', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none',
          variant === 'ghost' && 'text-neutral-400 hover:text-white hover:bg-neutral-800/60',
          variant === 'filled' && 'bg-white text-black hover:scale-105',
          size === 'sm' && 'h-8 w-8',
          size === 'md' && 'h-10 w-10',
          size === 'lg' && 'h-12 w-12',
          className
        )}
        {...props}
      />
    );
  }
);
IconButton.displayName = 'IconButton';
