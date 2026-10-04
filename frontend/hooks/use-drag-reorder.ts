'use client';

import * as React from 'react';

interface DragState<K> {
  list: K;
  from: number;
  to: number;
  dy: number;
  startY: number;
  rowHeight: number;
}

/**
 * Drag-handle reordering with pointer events (touch and mouse) plus arrow
 * keys on the handle. Rows must carry `data-reorder-row`; `list` tells apart
 * several reorderable lists on one screen.
 */
export function useDragReorder<K extends string>(
  lengthOf: (list: K) => number,
  onMove: (list: K, from: number, to: number) => void
) {
  const [drag, setDrag] = React.useState<DragState<K> | null>(null);

  const handleProps = (list: K, index: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      const row = e.currentTarget.closest<HTMLElement>('[data-reorder-row]');
      if (!row) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ list, from: index, to: index, dy: 0, startY: e.clientY, rowHeight: row.offsetHeight });
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (!drag) return;
      const dy = e.clientY - drag.startY;
      const to = Math.max(0, Math.min(lengthOf(drag.list) - 1, drag.from + Math.round(dy / drag.rowHeight)));
      setDrag({ ...drag, dy, to });
    },
    onPointerUp: () => {
      if (drag && drag.from !== drag.to) onMove(drag.list, drag.from, drag.to);
      setDrag(null);
    },
    onPointerCancel: () => setDrag(null),
    onKeyDown: (e: React.KeyboardEvent) => {
      const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : null;
      if (to === null || to < 0 || to >= lengthOf(list)) return;
      e.preventDefault();
      onMove(list, index, to);
    },
  });

  /** The dragged row follows the pointer; the rows it passes slide out of the way. */
  const rowStyle = (list: K, index: number): React.CSSProperties | undefined => {
    if (!drag || drag.list !== list) return undefined;
    if (index === drag.from) return { transform: `translateY(${drag.dy}px)`, zIndex: 10, position: 'relative' };
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return { transform: `translateY(${-drag.rowHeight}px)` };
    if (drag.from > drag.to && index >= drag.to && index < drag.from) return { transform: `translateY(${drag.rowHeight}px)` };
    return undefined;
  };

  const isDragged = (list: K, index: number) => drag?.list === list && drag.from === index;

  return { isDragging: drag !== null, handleProps, rowStyle, isDragged };
}
