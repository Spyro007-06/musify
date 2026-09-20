'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

/**
 * No marketing page — visiting "/" sends you straight into the app:
 * /home if you're already signed in, /login otherwise. Mirrors the
 * isInitializing/isAuthenticated redirect pattern AuthGuard and the
 * login page already use.
 */
export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isInitializing } = useAuthStore();

  useEffect(() => {
    if (isInitializing) return;
    router.replace(isAuthenticated ? '/home' : '/login');
  }, [isAuthenticated, isInitializing, router]);

  return (
    <div
      role="status"
      aria-label="Loading MUSIFY"
      className="flex h-dvh w-full items-center justify-center bg-canvas"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
    </div>
  );
}
