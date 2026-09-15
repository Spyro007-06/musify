"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { playlistService } from "@/services/playlist";
import { PlaylistCard } from "@/shared/components/cards/PlaylistCard";

export default function LibraryPage() {
  const { data: playlists = [], refetch } = useQuery({
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
    <div className="space-y-12 select-none">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Library</h2>
        <p className="text-white/40 text-xs">Manage your playlists, downloads and favorite music collections.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Liked Songs card block */}
        <Link
          href="/liked-songs"
          className="col-span-1 md:col-span-2 relative rounded-3xl p-8 overflow-hidden bg-gradient-to-br from-[#4720ca] via-[#5d39d9] to-[#0b0b0f] border border-white/5 group shadow-2xl flex flex-col justify-end min-h-[220px]"
        >
          <div className="absolute top-6 right-6 w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite
            </span>
          </div>
          <div className="relative z-10 space-y-2">
            <h3 className="text-3xl font-black text-white tracking-tight">Liked Songs</h3>
            <p className="text-white/70 text-sm">All your favorite tracks compiled in one immersive list.</p>
          </div>
        </Link>

        {/* Create playlist quick card */}
        <div
          onClick={handleCreatePlaylist}
          className="col-span-1 rounded-3xl p-8 bg-white/5 border border-white/10 flex flex-col justify-between min-h-[220px] group hover:bg-white/10 transition-all cursor-pointer hover:border-[#4cf479]/40"
        >
          <div>
            <span className="material-symbols-outlined text-4xl text-[#4cf479] mb-4">add_circle</span>
            <h3 className="text-xl font-bold text-white mb-2">Create Playlist</h3>
            <p className="text-white/40 text-xs">Build a customized collection of soundscapes.</p>
          </div>
          <button className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white tracking-wide transition-all mt-4">
            NEW PLAYLIST
          </button>
        </div>
      </div>

      {/* User playlists collection */}
      <section className="pb-12">
        <h3 className="text-lg font-bold text-white mb-6">Your Playlists</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
          {playlists.length === 0 && (
            <div className="col-span-full py-12 text-center glass-card rounded-2xl border border-white/5">
              <span className="material-symbols-outlined text-4xl text-white/20 mb-2">queue_music</span>
              <p className="text-xs text-white/40">You haven&apos;t created any playlists yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
