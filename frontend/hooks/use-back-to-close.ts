'use client';

import { useEffect, useRef } from 'react';

// Open overlays, oldest first. Only the newest one closes on Back, even
// though every open overlay's listener hears the same popstate.
const openOverlays: number[] = [];
let nextId = 0;

/**
 * While `open`, the phone's Back gesture/button closes this overlay instead
 * of leaving the page underneath: opening adds a history entry (Next.js
 * copies its own state into it, so the page stays put), Back pops it.
 * Closing another way (✕, Escape, swipe) removes the entry again.
 *
 * Only for overlays whose closing never coincides with a navigation: the
 * cleanup's history.back() would undo a router.push made in the same tick.
 */
export function useBackToClose(open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    const id = ++nextId;
    openOverlays.push(id);
    window.history.pushState({ musifyOverlay: id }, '');

    let closedByBack = false;
    const onPopState = () => {
      if (openOverlays[openOverlays.length - 1] !== id) return;
      closedByBack = true;
      closeRef.current();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      openOverlays.splice(openOverlays.indexOf(id), 1);
      if (!closedByBack && window.history.state?.musifyOverlay === id) window.history.back();
    };
  }, [open]);
}
