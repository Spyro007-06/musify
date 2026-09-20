'use client';

import * as React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, ToastItem, ToastVariant } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';

const VARIANT_STYLES: Record<ToastVariant, { border: string; icon: string }> = {
  success: { border: 'border-brand-500/30', icon: 'text-brand-400' },
  danger: { border: 'border-danger-500/30', icon: 'text-danger-400' },
  warning: { border: 'border-warning-500/30', icon: 'text-warning-400' },
  info: { border: 'border-info-500/30', icon: 'text-info-400' },
};

const VARIANT_ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  danger: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function Toast({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const styles = VARIANT_STYLES[toast.variant];
  const Icon = VARIANT_ICONS[toast.variant];

  React.useEffect(() => {
    if (toast.duration <= 0) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-neutral-900/95 px-4 py-3 text-xs text-white shadow-2xl backdrop-blur-md',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        styles.border
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', styles.icon)} />
      <span className="min-w-0 flex-1 leading-relaxed">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-white transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Fixed-position stack, mounted once near the app root. Sits above the
 * mini-player on both mobile and desktop; the player itself pushes it up
 * via the same bottom offset the old bespoke playback-error toast used.
 */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-28 md:bottom-24 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
