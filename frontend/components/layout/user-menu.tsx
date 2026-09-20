'use client';

import * as React from 'react';
import Link from 'next/link';
import { User as UserIcon, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { User } from '@/types/user';
import { cn } from '@/lib/utils/cn';

interface UserMenuProps {
  user: User;
  className?: string;
}

export function UserMenu({ user, className }: UserMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { logout } = useAuth();

  // Close menu on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const initials = (user.displayName || user.username || 'U')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={menuRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        id="user-menu-button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User account menu"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/90 py-1 pl-1 pr-1.5 sm:pr-3 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-700 text-xs font-semibold text-white">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.username}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <span className="hidden sm:inline max-w-[120px] truncate text-xs font-medium">
          {user.displayName || user.username}
        </span>
        <ChevronDown className={cn('hidden sm:block h-3.5 w-3.5 text-neutral-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-neutral-800 bg-neutral-950 p-1.5 shadow-2xl backdrop-blur focus:outline-none"
        >
          {/* User info header */}
          <div className="px-3 py-2 border-b border-neutral-800/80 mb-1">
            <p className="text-xs font-semibold text-white truncate">
              {user.displayName || user.username}
            </p>
            <p className="text-[11px] text-neutral-400 truncate">
              {user.email || `@${user.username}`}
            </p>
            {user.isPremium && (
              <span className="inline-block mt-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                Premium
              </span>
            )}
          </div>

          {/* Links */}
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <UserIcon className="h-4 w-4 text-neutral-400" />
            <span>Profile</span>
          </Link>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <Settings className="h-4 w-4 text-neutral-400" />
            <span>Settings</span>
          </Link>

          <div className="my-1 border-t border-neutral-800" />

          {/* Logout */}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setIsOpen(false);
              await logout();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-danger-400 transition-colors hover:bg-danger-950/40 hover:text-danger-300 text-left"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
