'use client';

import * as React from 'react';
import { Brand } from './brand';

// After this long, say it's still working instead of looking frozen.
const SLOW_AFTER_MS = 4000;

/**
 * Full-screen boot splash shown while the session is being resolved.
 *
 * Rendered as a `fixed` overlay on top of the real page rather than in place
 * of it. The session can resolve asynchronously very soon after mount — if
 * this replaced the page tree instead of overlaying it, that fast follow-up
 * update could land while React was still hydrating the initial tree and
 * trip a "hydration mismatch" (the DOM briefly disagreeing with what React
 * expects there). Overlaying keeps the underlying tree's shape stable across
 * that transition; only the overlay's presence toggles.
 */
export function AppSplash() {
  const [isSlow, setIsSlow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-label="Loading MUSIFY"
      className="fixed inset-0 bottom-[calc(-1*var(--ios-gap))] z-[100] flex w-full flex-col items-center justify-center gap-6 auth-backdrop px-8 text-center"
    >
      <Brand size="lg" />
      {isSlow && (
        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-brand-400" />
          <p className="max-w-xs text-sm text-neutral-300">
            Taking longer than usual to connect. Hang tight, it&rsquo;ll pick up where you left off.
          </p>
        </div>
      )}
    </div>
  );
}
