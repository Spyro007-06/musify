'use client';

import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type AlertVariant = 'danger' | 'warning' | 'info' | 'success';

const VARIANT_STYLES: Record<AlertVariant, { border: string; bg: string; text: string; icon: string }> = {
  danger: { border: 'border-danger-500/20', bg: 'bg-danger-500/10', text: 'text-danger-300', icon: 'text-danger-400' },
  warning: { border: 'border-warning-500/20', bg: 'bg-warning-500/10', text: 'text-warning-300', icon: 'text-warning-400' },
  info: { border: 'border-info-500/20', bg: 'bg-info-500/10', text: 'text-info-300', icon: 'text-info-400' },
  // No dedicated "success" color token in the design system — brand mint
  // already carries that meaning everywhere else (buttons, confirmations).
  success: { border: 'border-brand-500/20', bg: 'bg-brand-500/10', text: 'text-brand-300', icon: 'text-brand-400' },
};

const VARIANT_ICONS: Record<AlertVariant, React.ElementType> = {
  danger: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Shared inline banner for form/page-level feedback (validation errors, save
 * confirmations, fetch failures). Renders with role="alert" so assistive
 * tech announces it as soon as it mounts — always mount it conditionally
 * (don't just hide it) so that announcement actually fires.
 */
export function Alert({ variant = 'danger', title, children, onDismiss, className }: AlertProps) {
  const styles = VARIANT_STYLES[variant];
  const Icon = VARIANT_ICONS[variant];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border p-3 text-xs',
        styles.border,
        styles.bg,
        styles.text,
        className
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', styles.icon)} />
      <div className="min-w-0 flex-1">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
