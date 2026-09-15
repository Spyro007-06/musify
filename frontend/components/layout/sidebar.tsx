'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music2 } from 'lucide-react';
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
        <h2 className="px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
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
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-neutral-400',
                    isActive
                      ? 'bg-neutral-800 text-white font-semibold'
                      : 'text-neutral-400 hover:bg-neutral-900/80 hover:text-neutral-200'
                  )}
                >
                  {/* Visual active indicator stripe */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-white"
                    />
                  )}
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-200'
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
        'flex h-full w-60 flex-col border-r border-neutral-800 bg-black p-4 select-none',
        className
      )}
    >
      {/* Brand logo */}
      <div className="mb-6 flex items-center gap-2.5 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black shadow-sm">
          <Music2 className="h-4 w-4" />
        </div>
        <Link
          href="/home"
          onClick={onNavigate}
          className="text-lg font-extrabold tracking-tight text-white hover:opacity-90 transition-opacity"
        >
          MUSIFY
        </Link>
      </div>

      {/* Navigation groups */}
      <nav aria-label="Sidebar navigation" className="flex-1 space-y-6 overflow-y-auto pr-1">
        {renderNavGroup('Menu', MAIN_NAV_ITEMS)}
        {renderNavGroup('Library', LIBRARY_NAV_ITEMS)}
        {renderNavGroup('AI Studio', AI_NAV_ITEMS)}
      </nav>
    </aside>
  );
}
