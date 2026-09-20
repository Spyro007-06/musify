'use client';

import * as React from 'react';
import { AlertCircle, Lock, RefreshCw, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type ErrorStateVariant = 'danger' | 'warning' | 'neutral';

const VARIANT_STYLES: Record<ErrorStateVariant, { border: string; bg: string; iconBg: string; iconText: string }> = {
  danger: {
    border: 'border-danger-500/20',
    bg: 'bg-danger-950/10',
    iconBg: 'bg-danger-500/10 border-danger-500/20',
    iconText: 'text-danger-400',
  },
  // For access-denied states (403) — a locked door isn't the same problem
  // as a broken request, so it gets amber instead of red.
  warning: {
    border: 'border-warning-500/20',
    bg: 'bg-warning-950/10',
    iconBg: 'bg-warning-500/10 border-warning-500/20',
    iconText: 'text-warning-400',
  },
  // For "genuinely not found" / empty states — not an error at all, so it
  // stays in the neutral palette rather than alarming the user.
  neutral: {
    border: 'border-white/10',
    bg: 'bg-neutral-900/30',
    iconBg: 'bg-neutral-800 border-neutral-700',
    iconText: 'text-neutral-500',
  },
};

export interface ErrorStateProps {
  title: string;
  message?: string;
  icon?: React.ElementType;
  variant?: ErrorStateVariant;
  onRetry?: () => void;
  retryLabel?: string;
  /** 'inline' fits inside a section (home/browse rows); 'full' fills a page. */
  size?: 'inline' | 'full';
  className?: string;
}

/**
 * Shared message+retry state for data-fetch failures, access-denied
 * responses, and empty/not-found results — the same shape nearly every
 * list and detail page needs, previously hand-rolled per file.
 */
export function ErrorState({
  title,
  message,
  icon,
  variant = 'danger',
  onRetry,
  retryLabel = 'Try Again',
  size = 'inline',
  className,
}: ErrorStateProps) {
  const styles = VARIANT_STYLES[variant];
  const Icon = icon || (variant === 'warning' ? Lock : variant === 'neutral' ? SearchX : AlertCircle);
  const isFull = size === 'full';

  return (
    <div
      role={variant === 'danger' ? 'alert' : undefined}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border text-center',
        styles.border,
        styles.bg,
        isFull ? 'min-h-[50vh] px-6 py-16' : 'px-6 py-12',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl border mb-4',
          styles.iconBg,
          isFull ? 'h-16 w-16' : 'h-12 w-12'
        )}
      >
        <Icon className={cn(styles.iconText, isFull ? 'h-8 w-8' : 'h-6 w-6')} />
      </div>
      <h3 className={cn('font-bold text-white mb-1.5', isFull ? 'text-xl' : 'text-base')}>{title}</h3>
      {message && (
        <p className={cn('text-neutral-400 max-w-sm', isFull ? 'text-sm' : 'text-xs')}>{message}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'mt-5 inline-flex items-center gap-2 rounded-full font-semibold transition-colors',
            variant === 'warning'
              ? 'bg-warning-500/15 text-warning-300 hover:bg-warning-500/25'
              : 'bg-danger-500/15 text-danger-300 hover:bg-danger-500/25',
            isFull ? 'px-5 py-2.5 text-sm' : 'px-4 py-2 text-xs'
          )}
        >
          <RefreshCw className={isFull ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
