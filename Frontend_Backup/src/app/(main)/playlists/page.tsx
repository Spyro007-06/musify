"use client";

import { useQuery } from "@tanstack/react-query";
import { playlistService } from "@/services/playlist";
import { PlaylistCard } from "@/shared/components/cards/PlaylistCard";

export default function PlaylistsPage() {
  const { data: playlists = [], isLoading, refetch } = useQuery({
    queryKey: ["playlists"],
    queryFn: playlistService.getPlaylists,
  });

  const handleCreatePlaylist = async () => {
    const title = window.prompt("Enter a name for your new playlist:");
    if (!title || !title.trim()) return;

    const description = window.prompt("Enter an optional description:") || "";

    try {
      await playlistService.createPlaylist({ title: title.trim(), description });
      refetch();
    } catch (err) {
      console.error("Failed to create playlist:", err);
      alert("Failed to create playlist. Please try again.");
    }
  };

  return (
    <div className="space-y-12 select-none py-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Playlists</h2>
          <p className="text-white/40 text-xs">Your custom audio compilation collections.</p>
        </div>
        <button
          onClick={handleCreatePlaylist}
          className="px-5 py-2.5 bg-[#4cf479] hover:bg-[#69ff89] text-[#003913] rounded-full text-xs font-black tracking-wider uppercase transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm font-black">add</span>
          Create Playlist
        </button>
      </div>

      <section className="pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square w-full bg-white/5 rounded-2xl animate-pulse" />
                <div className="h-4 w-3/4 bg-white/5 rounded-md animate-pulse" />
                <div className="h-3 w-1/2 bg-white/5 rounded-md animate-pulse" />
              </div>
            ))
          ) : (
            playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))
          )}

          {!isLoading && playlists.length === 0 && (
            <div className="col-span-full py-24 text-center glass-card rounded-3xl border border-white/5">
              <span className="material-symbols-outlined text-5xl text-white/20 mb-3">queue_music</span>
              <p className="text-sm text-white/55 font-black mb-1">No custom playlists created yet</p>
              <p className="text-xs text-white/30 max-w-xs mx-auto">
                Create a new playlist using the button above to start compiling your custom soundscapes.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
