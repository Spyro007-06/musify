import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
          variant === 'primary' && 'bg-brand-400 text-black hover:bg-brand-300',
          variant === 'secondary' && 'bg-neutral-800 text-white hover:bg-neutral-700',
          variant === 'outline' && 'border border-neutral-700 text-white hover:bg-neutral-800',
          variant === 'ghost' && 'text-neutral-400 hover:text-white hover:bg-neutral-800/50',
          variant === 'danger' && 'bg-danger-700 text-white hover:bg-danger-600',
          size === 'sm' && 'h-8 px-3 text-xs',
          size === 'md' && 'h-10 px-4 text-sm',
          size === 'lg' && 'h-12 px-6 text-base',
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
