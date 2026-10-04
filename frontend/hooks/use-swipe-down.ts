'use client';

import * as React from 'react';

const DISMISS_PX = 120; // dragged at least this far: close
const FLICK_PX_PER_MS = 0.6; // or flicked down at least this fast
const DRAG_START_PX = 8; // movement before it counts as a drag, not a tap

/**
 * Drag-down-to-dismiss for a full-screen sheet, touch only. Spread
 * `handlers` on the area you drag by (give it `touch-none` so the browser
 * doesn't scroll instead) and put `style` on the sheet itself.
 */
export function useSwipeDown(onDismiss: () => void) {
  const start = React.useRef<{ y: number; t: number; id: number; dragging: boolean } | null>(null);
  const [offset, setOffset] = React.useState(0);

  const end = () => {
    start.current = null;
    setOffset(0);
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'touch') return;
      start.current = { y: e.clientY, t: performance.now(), id: e.pointerId, dragging: false };
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s || e.pointerId !== s.id) return;
      const dy = e.clientY - s.y;
      if (!s.dragging) {
        if (dy < DRAG_START_PX) return;
        // Capture only once it's a drag, so a plain tap still reaches the buttons inside.
        s.dragging = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // The finger already lifted (a very fast flick); the drag still resolves on pointerup.
        }
      }
      setOffset(Math.max(0, dy));
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s || !s.dragging) return end();
      const distance = Math.max(0, e.clientY - s.y);
      const speed = distance / Math.max(1, performance.now() - s.t);
      end();
      if (distance > DISMISS_PX || (distance > 30 && speed > FLICK_PX_PER_MS)) onDismiss();
    },
    onPointerCancel: end,
  };

  const style: React.CSSProperties | undefined =
    offset > 0 ? { transform: `translateY(${offset}px)`, transition: 'none' } : undefined;

  return { handlers, style };
}
