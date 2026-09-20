'use client';

import * as React from 'react';
import { X, Trash2, Music2, ListMusic } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { formatDuration } from '@/lib/utils/format-duration';
import { Track } from '@/types/track';

export function QueuePanel() {
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  // Close on Escape key and body scroll lock
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isQueueOpen) {
        setQueueOpen(false);
      }
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

  if (!isQueueOpen) return null;

  const upcomingTracks = queue.slice(currentIndex + 1);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setQueueOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-label="Play Queue"
        aria-modal="true"
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-neutral-950 border-l border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <ListMusic className="h-5 w-5 text-brand-400" />
            <h3 className="text-lg font-bold text-white">Play Queue</h3>
            <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
              {queue.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {upcomingTracks.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                aria-label="Clear upcoming queue"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setQueueOpen(false)}
              aria-label="Close queue"
              className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Now Playing section */}
          {currentTrack ? (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Now Playing
              </span>
              <div className="flex items-center justify-between rounded-xl bg-neutral-900/80 p-3 border border-brand-500/20 shadow-md">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-800">
                    <ImageWithFallback
                      src={currentTrack.artwork}
                      alt={currentTrack.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-semibold text-brand-400">
                      {currentTrack.title}
                    </p>
                    <p className="truncate text-xs text-neutral-400">
                      {currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-neutral-400 tabular-nums">
                  {formatDuration(currentTrack.duration || currentTrack.durationSeconds || 0)}
                </span>
              </div>
            </div>
          ) : null}

          {/* Up Next section */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Up Next {upcomingTracks.length > 0 && `(${upcomingTracks.length})`}
            </span>

            {upcomingTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 py-12 text-center">
                <Music2 className="h-8 w-8 text-neutral-600 mb-2" />
                <p className="text-sm font-medium text-neutral-400">No tracks in queue</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Play tracks from Home, albums, or playlists to fill your queue
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingTracks.map((track: Track, idx: number) => {
                  const durationSecs =
                    track.duration || track.durationSeconds || (track.durationMs ? track.durationMs / 1000 : 0);

                  return (
                    <div
                      key={`queue-${track.id}-${idx}`}
                      onClick={() => playTrack(track)}
                      className="group flex items-center justify-between rounded-lg p-2 hover:bg-white/[0.06] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="w-4 text-center text-xs text-neutral-500 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-neutral-800">
                          <ImageWithFallback
                            src={track.artwork}
                            alt={track.title}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <div className="overflow-hidden">
                          <p className="truncate text-xs font-medium text-white group-hover:text-brand-400 transition-colors">
                            {track.title}
                          </p>
                          <p className="truncate text-[11px] text-neutral-400">
                            {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-neutral-500 tabular-nums">
                          {formatDuration(durationSecs)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(track.id);
                          }}
                          aria-label={`Remove ${track.title} from queue`}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 hover:text-danger-400 hover:bg-danger-500/10 transition-all md:opacity-0 md:group-hover:opacity-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
