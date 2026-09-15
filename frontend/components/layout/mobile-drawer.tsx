'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { Sidebar } from './sidebar';

export function MobileDrawer() {
  const { mobileMenuOpen, setMobileMenuOpen } = useUiStore();

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, setMobileMenuOpen]);

  if (!mobileMenuOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
      className="fixed inset-0 z-50 flex md:hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 flex w-72 max-w-[80vw] flex-col bg-neutral-950 border-r border-neutral-800 shadow-2xl">
        <div className="flex items-center justify-end p-3 border-b border-neutral-800/80">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Sidebar
            className="w-full border-r-0 bg-transparent p-4"
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
