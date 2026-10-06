'use client';

import { CircleCheck, Download, Loader2, Smartphone, Trash2 } from 'lucide-react';
import { create } from 'zustand';
import { BASE_URL } from '@/lib/api/client';
import { removeOffline, saveOffline, useOfflineStore } from '@/stores/offline-store';
import { toast } from '@/stores/toast-store';
import { Dialog, DialogHeader } from '@/components/ui/dialog';
import { Track } from '@/types/track';
import { cn } from '@/lib/utils/cn';

/** The song whose "where to save" choice is open: one dialog serves every Download button. */
const useChooser = create<{ track: Track | null }>(() => ({ track: null }));

/** What every Download button does: ask whether to save in Musify or to the device. */
export function useDownloadTrack() {
  return (track: Track) => useChooser.setState({ track });
}

/**
 * The song file itself, into the phone's Downloads folder. Navigates to the
 * backend's download route, which answers with Content-Disposition:
 * attachment; browsers save that even cross-origin (a navigation isn't
 * subject to CORS the way a fetch read would be).
 */
function saveToDevice(track: Track) {
  const link = document.createElement('a');
  link.href = `${BASE_URL}/music/tracks/${encodeURIComponent(track.id)}/download`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast.success(`Downloading "${track.title}" to this device…`);
}

async function saveInApp(track: Track) {
  if (useOfflineStore.getState().saving.has(track.id)) return;
  try {
    await saveOffline(track);
    toast.success(`"${track.title}" is saved in Musify (Library → Downloads).`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : `Couldn't save "${track.title}".`);
  }
}

async function removeFromApp(track: Track) {
  await removeOffline(track.id);
  toast.success(`Removed "${track.title}" from Musify.`, undefined, { label: 'Undo', onClick: () => saveInApp(track) });
}

/** Whether this song is saved in Musify. */
export function useIsDownloaded(trackId?: string) {
  return useOfflineStore((s) => !!trackId && s.ids.has(trackId));
}

/** The Download button's icon: a spinner while saving in Musify, a check once saved. */
export function DownloadIcon({ trackId, className }: { trackId?: string; className?: string }) {
  const saved = useIsDownloaded(trackId);
  const saving = useOfflineStore((s) => !!trackId && s.saving.has(trackId));
  if (saving) return <Loader2 className={cn(className, 'animate-spin')} />;
  return saved ? <CircleCheck className={cn(className, 'text-brand-400')} /> : <Download className={className} />;
}

function Choice({ icon: Icon, title, detail, onClick }: { icon: typeof Download; title: string; detail: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 text-left transition-colors hover:border-brand-500/40 hover:bg-neutral-900"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs leading-relaxed text-neutral-400">{detail}</span>
      </span>
    </button>
  );
}

/** Mounted once, in the app shell: where to save the song a Download button was tapped on. */
export function DownloadChooser() {
  const track = useChooser((s) => s.track);
  const saved = useIsDownloaded(track?.id);
  const close = () => useChooser.setState({ track: null });
  if (!track) return null;

  const pick = (action: (t: Track) => unknown) => {
    close();
    action(track);
  };

  return (
    <Dialog isOpen onClose={close} labelledBy="download-chooser-title">
      <DialogHeader icon={Download} title="Download" titleId="download-chooser-title" subtitle={track.title} onClose={close} />
      <div className="space-y-2">
        {saved ? (
          <Choice
            icon={Trash2}
            title="Remove from Musify"
            detail="It's saved in the app. Remove it to free up space on your phone."
            onClick={() => pick(removeFromApp)}
          />
        ) : (
          <Choice
            icon={Download}
            title="Save in Musify"
            detail="Kept inside the app (Library → Downloads). Plays from your phone: no data used, no buffering on a weak connection."
            onClick={() => pick(saveInApp)}
          />
        )}
        <Choice
          icon={Smartphone}
          title="Save to this device"
          detail="Downloads the song file (.m4a) into your phone's Downloads folder, to keep or share."
          onClick={() => pick(saveToDevice)}
        />
      </div>
    </Dialog>
  );
}
