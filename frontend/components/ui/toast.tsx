import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  onClose?: () => void;
  className?: string;
}

export function Toast({ message, type = 'info', onClose, className }: ToastProps) {
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center justify-between rounded-lg border px-4 py-3 shadow-xl backdrop-blur-sm text-sm',
        type === 'info' && 'border-neutral-800 bg-neutral-900/95 text-white',
        type === 'success' && 'border-emerald-800 bg-emerald-950/95 text-emerald-200',
        type === 'error' && 'border-red-800 bg-red-950/95 text-red-200',
        className
      )}
    >
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-3 text-neutral-400 hover:text-white">
          ✕
        </button>
      )}
    </div>
  );
}
