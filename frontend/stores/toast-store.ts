import { create } from 'zustand';

export type ToastVariant = 'success' | 'danger' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  /** ms until auto-dismiss; 0 means it stays until manually dismissed. */
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  show: (variant: ToastVariant, message: string, duration?: number) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3500,
  info: 3500,
  warning: 5000,
  // Errors stay a little longer — they're more likely to need re-reading.
  danger: 6000,
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (variant, message, duration) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const resolvedDuration = duration ?? DEFAULT_DURATION[variant];
    set((s) => ({ toasts: [...s.toasts, { id, variant, message, duration: resolvedDuration }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Fire-and-forget helpers — call from anywhere, no hook needed. */
export const toast = {
  success: (message: string, duration?: number) => useToastStore.getState().show('success', message, duration),
  error: (message: string, duration?: number) => useToastStore.getState().show('danger', message, duration),
  info: (message: string, duration?: number) => useToastStore.getState().show('info', message, duration),
  warning: (message: string, duration?: number) => useToastStore.getState().show('warning', message, duration),
};
