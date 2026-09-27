'use client';

import * as React from 'react';
import { X, Music2, ListEnd, Menu, Shuffle, Repeat, Repeat1, Timer, Circle, CheckCircle2 } from 'lucide-react';
import { usePlayerStore, QueueRef, SleepTimerOption } from '@/stores/player-store';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Track } from '@/types/track';
import { cn } from '@/lib/utils/cn';

type Section = QueueRef['section'];
const refKey = (section: Section, index: number) => `${section}:${index}`;

interface DragState {
  section: Section;
  from: number;
  to: number;
  dy: number;
  startY: number;
  rowHeight: number;
}

/**
 * Spotify-style queue: Now playing, then your Queued songs (always played
 * first), then the rest of what you're playing ("Next from: …") and the
 * auto-added recommendations. Drag handles reorder within a section; Edit
 * selects songs to move to the top of the queue or remove.
 */
export function QueuePanel() {
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const userQueue = usePlayerStore((s) => s.userQueue);
  const queueSource = usePlayerStore((s) => s.queueSource);
  const recommendedIds = usePlayerStore((s) => s.recommendedIds);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const playFromQueue = usePlayerStore((s) => s.playFromQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const moveInQueue = usePlayerStore((s) => s.moveInQueue);
  const moveToTopOfQueue = usePlayerStore((s) => s.moveToTopOfQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const reshuffle = usePlayerStore((s) => s.reshuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const [editing, setEditing] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [drag, setDrag] = React.useState<DragState | null>(null);

  // Close on Escape key and body scroll lock
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isQueueOpen) setQueueOpen(false);
    };
    if (isQueueOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isQueueOpen, setQueueOpen]);

  // Leave edit mode whenever the sheet closes.
  React.useEffect(() => {
    if (!isQueueOpen) {
      setEditing(false);
      setSelected(new Set());
    }
  }, [isQueueOpen]);

  if (!isQueueOpen) return null;

  const upcoming = queue.slice(currentIndex + 1);
  const recommended = new Set(recommendedIds);
  const firstRecommended = upcoming.findIndex((t) => recommended.has(t.id));
  const sectionLength = (section: Section) => (section === 'queued' ? userQueue.length : upcoming.length);
  const selectedRefs = (): QueueRef[] =>
    [...selected].map((k) => {
      const [section, index] = k.split(':');
      return { section: section as Section, index: Number(index) };
    });

  const toggleSelected = (section: Section, index: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const key = refKey(section, index);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const runOnSelection = (action: (refs: QueueRef[]) => void) => {
    action(selectedRefs());
    setSelected(new Set()); // positions shift after any edit
  };

  // --- drag to reorder (pointer events: works for touch and mouse) ---
  const onHandleDown = (e: React.PointerEvent<HTMLButtonElement>, section: Section, index: number) => {
    const row = e.currentTarget.closest<HTMLElement>('[data-queue-row]');
    if (!row) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ section, from: index, to: index, dy: 0, startY: e.clientY, rowHeight: row.offsetHeight });
  };
  const onHandleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    const to = Math.max(0, Math.min(sectionLength(drag.section) - 1, drag.from + Math.round(dy / drag.rowHeight)));
    setDrag({ ...drag, dy, to });
  };
  const onHandleUp = () => {
    if (drag) moveInQueue(drag.section, drag.from, drag.to);
    setDrag(null);
  };
  const onHandleKey = (e: React.KeyboardEvent, section: Section, index: number) => {
    const to = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : null;
    if (to === null || to < 0 || to >= sectionLength(section)) return;
    e.preventDefault();
    moveInQueue(section, index, to);
  };

  const rowShift = (section: Section, index: number): React.CSSProperties | undefined => {
    if (!drag || drag.section !== section) return undefined;
    if (index === drag.from) return { transform: `translateY(${drag.dy}px)`, zIndex: 10, position: 'relative' };
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return { transform: `translateY(${-drag.rowHeight}px)` };
    if (drag.from > drag.to && index >= drag.to && index < drag.from) return { transform: `translateY(${drag.rowHeight}px)` };
    return undefined;
  };

  const renderRow = (track: Track, section: Section, index: number) => {
    const key = refKey(section, index);
    const isSelected = selected.has(key);
    const isDragged = drag?.section === section && drag.from === index;
    return (
      <div
        key={`${key}-${track.id}`}
        data-queue-row
        style={rowShift(section, index)}
        className={cn(
          'flex items-center gap-3 rounded-lg px-2 py-2',
          isDragged ? 'bg-neutral-800 shadow-2xl' : 'transition-transform duration-150',
          !drag && 'hover:bg-white/[0.06]'
        )}
      >
        {editing && (
          <button
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            aria-label={`Select ${track.title}`}
            onClick={() => toggleSelected(section, index)}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-neutral-400"
          >
            {isSelected ? <CheckCircle2 className="h-5 w-5 fill-brand-500 text-black" /> : <Circle className="h-5 w-5" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => (editing ? toggleSelected(section, index) : playFromQueue({ section, index }))}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-neutral-800">
            <ImageWithFallback src={track.artwork} alt="" fill sizes="44px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{track.title}</p>
            <p className="flex items-center gap-1 truncate text-xs text-neutral-400">
              {section === 'queued' && <ListEnd className="h-3.5 w-3.5 shrink-0 text-brand-400" aria-label="Queued" />}
              <span className="truncate">{track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}</span>
            </p>
          </div>
        </button>
        <button
          type="button"
          aria-label={`Reorder ${track.title} (drag, or use arrow keys)`}
          onPointerDown={(e) => onHandleDown(e, section, index)}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={() => setDrag(null)}
          onKeyDown={(e) => onHandleKey(e, section, index)}
          className="flex h-10 w-10 shrink-0 touch-none cursor-grab items-center justify-center rounded-full text-neutral-400 hover:text-white active:cursor-grabbing"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    );
  };

  const sectionLabel = (text: string) => (
    <p className="px-2 pt-2 text-sm font-semibold text-neutral-400">{text}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setQueueOpen(false)} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="Queue"
        aria-modal="true"
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-neutral-950 border-l border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-white">{editing ? 'Edit queue' : 'Queue'}</h3>
            {!editing && queueSource && (
              <p className="mt-0.5 truncate text-sm text-neutral-400">
                Playing <span className="font-semibold text-white">{queueSource}</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!editing && userQueue.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-colors"
              >
                Clear
              </button>
            )}
            {(userQueue.length > 0 || upcoming.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setEditing((e) => !e);
                  setSelected(new Set());
                }}
                className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-colors"
              >
                {editing ? 'Done' : 'Edit'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setQueueOpen(false)}
              aria-label="Close queue"
              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {currentTrack && (
            <div className="flex items-center gap-3 rounded-lg px-2 py-2">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded bg-neutral-800">
                <ImageWithFallback src={currentTrack.artwork} alt="" fill sizes="44px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-400">{currentTrack.title}</p>
                <p className="truncate text-xs text-neutral-400">
                  {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                </p>
              </div>
            </div>
          )}

          {userQueue.length > 0 && (
            <div className="border-b border-white/10 pb-2">
              {sectionLabel('Queued')}
              {userQueue.map((t, i) => renderRow(t, 'queued', i))}
            </div>
          )}

          {upcoming.length > 0 &&
            upcoming.map((t, i) => (
              <React.Fragment key={`next-group-${i}`}>
                {i === 0 && i !== firstRecommended && sectionLabel(queueSource ? `Next from: ${queueSource}` : 'Next up')}
                {i === firstRecommended && sectionLabel('Next up: Recommended tracks')}
                {renderRow(t, 'next', i)}
              </React.Fragment>
            ))}

          {userQueue.length === 0 && upcoming.length === 0 && (
            <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 py-12 text-center">
              <Music2 className="h-8 w-8 text-neutral-600 mb-2" />
              <p className="text-sm font-medium text-neutral-400">Nothing up next</p>
              <p className="text-xs text-neutral-500 mt-0.5">Use &ldquo;Add to queue&rdquo; on any song to line it up here</p>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          {editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => runOnSelection(moveToTopOfQueue)}
                className="flex-1 rounded-full bg-white/10 py-2.5 text-sm font-bold text-white disabled:opacity-40 hover:bg-white/20 transition-colors"
              >
                Move up
              </button>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => runOnSelection(removeFromQueue)}
                className="flex-1 rounded-full bg-white/10 py-2.5 text-sm font-bold text-white disabled:opacity-40 hover:bg-white/20 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              {shuffle && (
                <button
                  type="button"
                  onClick={reshuffle}
                  className="mb-2 w-full rounded-full bg-white/[0.06] py-2 text-xs font-semibold text-neutral-300 hover:bg-white/10 transition-colors"
                >
                  Reshuffle
                </button>
              )}
              <div className="grid grid-cols-3 gap-2">
                <BarButton label="Shuffle" active={shuffle} onClick={toggleShuffle} icon={<Shuffle className="h-5 w-5" />} />
                <BarButton
                  label={repeat === 'one' ? 'Repeat one' : 'Repeat'}
                  active={repeat !== 'off'}
                  onClick={cycleRepeat}
                  icon={repeat === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                />
                <SleepTimerButton />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BarButton({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl bg-white/[0.06] py-2.5 text-xs font-semibold transition-colors hover:bg-white/10',
        active ? 'text-brand-400' : 'text-neutral-300'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

const TIMER_OPTIONS: { label: string; value: SleepTimerOption }[] = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: 'End of track', value: 'end-of-track' },
];

/** Sleep timer: pause after N minutes, or when the current song ends. */
function SleepTimerButton() {
  const sleepEndsAt = usePlayerStore((s) => s.sleepEndsAt);
  const sleepAtTrackEnd = usePlayerStore((s) => s.sleepAtTrackEnd);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);
  const [open, setOpen] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());

  // Keep the "23 min" countdown fresh while a timer runs.
  React.useEffect(() => {
    if (!sleepEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [sleepEndsAt]);

  const active = Boolean(sleepEndsAt) || sleepAtTrackEnd;
  const label = sleepAtTrackEnd
    ? 'End of track'
    : sleepEndsAt
    ? `${Math.max(1, Math.ceil((sleepEndsAt - now) / 60_000))} min`
    : 'Timer';

  const choose = (value: SleepTimerOption) => {
    setSleepTimer(value);
    setNow(Date.now());
    setOpen(false);
  };

  return (
    <div className="relative">
      <BarButton label={label} active={active} onClick={() => setOpen((o) => !o)} icon={<Timer className="h-5 w-5" />} />
      {open && (
        <div role="menu" className="absolute bottom-full right-0 z-20 mb-2 w-48 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 py-1 shadow-2xl">
          <p className="px-3 py-2 text-xs font-semibold text-neutral-400">Stop audio in</p>
          {TIMER_OPTIONS.map((o) => (
            <button
              key={o.label}
              type="button"
              role="menuitem"
              onClick={() => choose(o.value)}
              className="block w-full px-3 py-2.5 text-left text-sm text-neutral-200 hover:bg-white/5"
            >
              {o.label}
            </button>
          ))}
          {active && (
            <button
              type="button"
              role="menuitem"
              onClick={() => choose(null)}
              className="block w-full border-t border-neutral-800 px-3 py-2.5 text-left text-sm text-danger-400 hover:bg-danger-950/30"
            >
              Turn off timer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
