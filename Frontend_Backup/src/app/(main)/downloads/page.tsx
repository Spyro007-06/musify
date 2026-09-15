"use client";

import Image from "next/image";
import { usePlayerStore } from "@/features/player/store/player-store";
import { useDownloadsStore } from "@/features/player/store/downloads-store";
import { formatDuration } from "@/shared/utils/utils";

export default function DownloadsPage() {
  const setQueue = usePlayerStore((state) => state.setQueue);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  const { downloadedTracks, removeDownload } = useDownloadsStore();

  const handleRowClick = (idx: number) => {
    const track = downloadedTracks[idx];
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      setQueue(downloadedTracks, idx);
    }
  };

  const handleRemoveDownload = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeDownload(id);
  };

  return (
    <div className="space-y-12 select-none py-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Offline Downloads</h2>
        <p className="text-white/40 text-xs">Audio tracks saved to your local cache for offline playback.</p>
      </div>

      <section className="pb-12">
        <div className="space-y-2 max-w-2xl">
          {downloadedTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => handleRowClick(idx)}
                className="flex items-center justify-between p-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="w-6 text-center text-xs font-bold text-white/30 group-hover:text-[#4cf479]">
                    {isCurrent && isPlaying ? (
                      <span className="material-symbols-outlined text-xs text-[#4cf479] animate-pulse">
                        equalizer
                      </span>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <div className="w-11 h-11 rounded-lg overflow-hidden relative flex-shrink-0 bg-white/5 border border-white/10">
                    {track.artwork && (
                      <Image
                        src={track.artwork}
                        alt={track.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`font-semibold text-sm block truncate ${
                        isCurrent ? "text-[#4cf479]" : "text-white"
                      }`}
                    >
                      {track.title}
                    </span>
                    <span className="text-[10px] text-white/40 block mt-0.5">
                      {track.artists.map((a) => a.name).join(", ")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span className="text-xs text-white/40 font-semibold">{formatDuration(track.duration)}</span>
                  
                  {/* Delete Download Option */}
                  <button
                    onClick={(e) => handleRemoveDownload(e, track.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-500 transition-all p-1"
                    title="Remove from Downloads"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>

                  <span className="material-symbols-outlined text-[#4cf479] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    download_done
                  </span>
                </div>
              </div>
            );
          })}

          {downloadedTracks.length === 0 && (
            <div className="py-24 text-center glass-card rounded-3xl border border-white/5">
              <span className="material-symbols-outlined text-5xl text-white/20 mb-3">download_for_offline</span>
              <p className="text-sm text-white/50 font-bold mb-1">No Offline Downloads</p>
              <p className="text-xs text-white/30 max-w-xs mx-auto">
                Stream a track and click the download button in the player to save it offline.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
