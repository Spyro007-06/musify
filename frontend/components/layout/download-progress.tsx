'use client';

import { CircleCheck, Download } from 'lucide-react';
import { useOfflineStore } from '@/stores/offline-store';

/** The "Download all" run, as a bar pinned to the top of the page on every screen while it works. */
export function DownloadProgress() {
  const batch = useOfflineStore((s) => s.batch);
  if (!batch) return null;

  const percent = Math.round((batch.done / batch.total) * 100);
  const Icon = batch.finished ? CircleCheck : Download;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 mb-4 rounded-2xl border border-white/10 bg-neutral-900/95 p-3 shadow-xl backdrop-blur"
    >
      <div className="flex items-center gap-2 text-xs">
        <Icon className="h-4 w-4 shrink-0 text-brand-400" />
        <span className="min-w-0 flex-1 truncate font-semibold text-white">
          {batch.finished ? `Saved "${batch.title}"` : `Downloading "${batch.title}"`}
        </span>
        <span className="shrink-0 tabular-nums text-neutral-400">
          {batch.done}/{batch.total}
          {batch.failed > 0 && ` · ${batch.failed} failed`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Download progress"
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div className="h-full rounded-full bg-brand-500 transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
