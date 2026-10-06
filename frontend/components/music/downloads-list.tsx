'use client';

import * as React from 'react';
import { Download, Pause, Play } from 'lucide-react';
import { TrackRow } from '@/components/music/track-row';
import { listOfflineTracks, useOfflineStore } from '@/stores/offline-store';
import { usePlayerStore } from '@/stores/player-store';
import { Track } from '@/types/track';
import { pluralize } from '@/lib/utils/pluralize';

/** Songs saved in the app (Library → Downloads): they play from the phone, using no data. */
export function DownloadsList() {
  const ids = useOfflineStore((s) => s.ids);
  const [tracks, setTracks] = React.useState<Track[] | null>(null);
  const playFrom = usePlayerStore((s) => s.playFrom);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  // Re-read whenever a song is saved or removed.
  React.useEffect(() => {
    listOfflineTracks()
      .then(setTracks)
      .catch(() => setTracks([]));
  }, [ids]);

  const isListPlaying = isPlaying && !!currentTrack && !!tracks?.some((t) => t.id === currentTrack.id);
  const play = (track: Track) => {
    if (tracks) playFrom('Downloads', track, tracks);
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Downloads</h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">
            {tracks ? `${pluralize(tracks.length, 'song')} · saved in Musify, no data used` : 'Loading…'}
          </p>
        </div>
        {!!tracks?.length && (
          <button
            type="button"
            onClick={() => (isListPlaying ? togglePlay() : play(tracks[0]))}
            aria-label={isListPlaying ? 'Pause downloads' : 'Play all downloads'}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-500 text-black shadow-xl shadow-brand-950/60 hover:scale-105 active:scale-95 hover:bg-brand-400 transition-all duration-300"
          >
            {isListPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
          </button>
        )}
      </div>

      {tracks?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800/80 text-neutral-500">
            <Download className="h-8 w-8 stroke-[1.5]" />
          </div>
          <h3 className="text-lg font-bold text-white">No downloads yet</h3>
          <p className="mt-1 max-w-md text-xs sm:text-sm text-neutral-400">
            Tap the download icon on any song and choose &ldquo;Save in Musify&rdquo;. Saved songs play straight
            from your phone: no data used, no buffering on a weak connection.
          </p>
        </div>
      )}

      {!!tracks?.length && (
        <div className="space-y-1">
          {tracks.map((track, index) => (
            <TrackRow key={track.id} track={track} index={index} onPlay={play} />
          ))}
        </div>
      )}
    </div>
  );
}
