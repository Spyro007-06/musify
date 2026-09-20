'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { cn } from '@/lib/utils/cn';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy: string;
  /** While true, the backdrop click and ESC key won't close the dialog. */
  isBusy?: boolean;
  /** Set to false while a nested dialog owns focus, without unmounting this one. */
  trapFocus?: boolean;
  maxWidth?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared modal shell: backdrop, ESC-to-close, body-scroll lock, and focus
 * trap. Previously each modal (delete/create playlist, add-to-playlist)
 * hand-rolled this same ~25 lines; this is the one place it lives now.
 * Renders only its children inside the card — callers own header/body/footer.
 */
export function Dialog({ isOpen, onClose, labelledBy, isBusy, trapFocus, maxWidth = 'max-w-md', children, className }: DialogProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen && (trapFocus ?? true));

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isBusy) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, isBusy, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => !isBusy && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          'relative z-10 w-full rounded-2xl border border-white/10 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-xl',
          'animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto',
          maxWidth,
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface DialogHeaderProps {
  icon: React.ElementType;
  iconVariant?: 'brand' | 'danger';
  title: string;
  titleId: string;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  closeDisabled?: boolean;
}

/** Icon badge + title + optional subtitle, with an optional top-right close button. */
export function DialogHeader({ icon: Icon, iconVariant = 'brand', title, titleId, subtitle, onClose, closeDisabled }: DialogHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
          iconVariant === 'danger'
            ? 'bg-danger-500/10 text-danger-400 border-danger-500/20'
            : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="text-lg font-bold text-white tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label="Close dialog"
          className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export interface DialogActionsProps {
  onCancel: () => void;
  cancelLabel?: string;
  cancelDisabled?: boolean;
  children: React.ReactNode;
}

/** Right-aligned Cancel + primary-action footer row, shared across every dialog. */
export function DialogActions({ onCancel, cancelLabel = 'Cancel', cancelDisabled, children }: DialogActionsProps) {
  return (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={cancelDisabled}
        className="rounded-full px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      {children}
    </div>
  );
}
