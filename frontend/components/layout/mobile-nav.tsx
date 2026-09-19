'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import {
  MOBILE_PRIMARY_NAV_ITEMS,
  isNavItemActive,
} from '@/lib/constants/navigation';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils/cn';

export function MobileNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { toggleMobileMenu, mobileMenuOpen } = useUiStore();

  return (
    <nav
      aria-label="Mobile navigation bar"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-neutral-800 bg-surface/95 px-2 pb-[env(safe-area-inset-bottom,0px)] h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md md:hidden',
        className
      )}
    >
      {MOBILE_PRIMARY_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = isNavItemActive(pathname, item.href, item.exact);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-medium transition-colors',
              isActive
                ? 'text-brand-300 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn('h-4 w-4 mb-0.5', isActive ? 'text-brand-300' : 'text-neutral-400')}
            />
            <span>{item.title}</span>
          </Link>
        );
      })}

      {/* "More" button to toggle full drawer */}
      <button
        type="button"
        onClick={toggleMobileMenu}
        aria-label="More navigation options"
        aria-expanded={mobileMenuOpen}
        className={cn(
          'flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-medium transition-colors',
          mobileMenuOpen ? 'text-brand-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        )}
      >
        <MoreHorizontal
          aria-hidden="true"
          className={cn('h-4 w-4 mb-0.5', mobileMenuOpen ? 'text-brand-300' : 'text-neutral-400')}
        />
        <span>More</span>
      </button>
    </nav>
  );
}
