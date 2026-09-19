'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brand } from './brand';
import {
  MAIN_NAV_ITEMS,
  LIBRARY_NAV_ITEMS,
  AI_NAV_ITEMS,
  isNavItemActive,
  NavItem,
} from '@/lib/constants/navigation';
import { cn } from '@/lib/utils/cn';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const renderNavGroup = (title: string, items: NavItem[]) => {
    return (
      <div className="space-y-1">
        <h2 className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {title}
        </h2>
        <ul role="list" className="space-y-0.5 pt-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(pathname, item.href, item.exact);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-neutral-400',
                    isActive
                      ? 'bg-brand-400/10 text-brand-300 font-semibold'
                      : 'text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-200'
                  )}
                >
                  {/* Visual active indicator stripe */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-brand-400"
                    />
                  )}
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-brand-300' : 'text-neutral-400 group-hover:text-neutral-200'
                    )}
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <aside
      aria-label="Main sidebar"
      className={cn(
        'flex h-full w-60 flex-col border-r border-neutral-800 bg-surface p-4 select-none',
        className
      )}
    >
      {/* Brand logo */}
      <Link href="/home" onClick={onNavigate} aria-label="Musify home" className="mb-8 mt-2 px-2 hover:opacity-90">
        <Brand />
      </Link>

      {/* Navigation groups */}
      <nav aria-label="Sidebar navigation" className="flex-1 space-y-6 overflow-y-auto pr-1">
        {renderNavGroup('Menu', MAIN_NAV_ITEMS)}
        {renderNavGroup('Library', LIBRARY_NAV_ITEMS)}
        {renderNavGroup('AI Studio', AI_NAV_ITEMS)}
      </nav>
    </aside>
  );
}
