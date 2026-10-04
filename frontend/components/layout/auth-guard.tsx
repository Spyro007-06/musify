'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { AppSplash } from './app-splash';

/**
 * Routes and prefixes that strictly require authentication.
 */
const AUTHENTICATED_PREFIXES = [
  '/home',
  '/discover',
  '/browse',
  '/library',
  '/profile',
  '/settings',
  '/ai',
];

/**
 * Checks whether a given pathname requires authentication.
 */
export function isRouteProtected(pathname: string): boolean {
  return AUTHENTICATED_PREFIXES.some((prefix) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isInitializing } = useAuthStore();

  const isProtected = isRouteProtected(pathname);

  useEffect(() => {
    // Never redirect while authentication is still initializing
    if (isInitializing) return;

    // If route requires authentication and user is not authenticated, redirect to login
    if (isProtected && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, isProtected, isAuthenticated, isInitializing, router]);

  // If on a protected route and not authenticated (and initialization finished), prevent flashing protected content
  if (isProtected && !isInitializing && !isAuthenticated) {
    return null;
  }

  // Render children unconditionally and layer the loading state on top
  // instead of swapping it in for children — session initialization can
  // finish very soon after mount, and replacing the whole tree at that
  // point risks racing React's hydration of it (see AppSplash's doc
  // comment for the full explanation of that failure mode).
  return (
    <>
      {children}
      {isProtected && isInitializing && <AppSplash />}
    </>
  );
}
