import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'bottom';
  children: React.ReactNode;
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  position = 'right',
  children,
  className,
}: DrawerProps) {
  if (!isOpen) return null;

  const positionStyles = {
    left: 'left-0 top-0 bottom-0 w-80',
    right: 'right-0 top-0 bottom-0 w-80',
    bottom: 'bottom-0 left-0 right-0 max-h-[80vh]',
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div
        className={cn(
          'fixed z-50 bg-neutral-900 border-neutral-800 p-4 shadow-2xl transition-transform',
          positionStyles[position],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
