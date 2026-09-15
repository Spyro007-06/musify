"use client";

import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { playlistService } from "@/services/playlist";
import { musicService } from "@/services/music";
import { usePlayerStore } from "@/features/player/store/player-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Track } from "@/types/music";

interface TrackActionMenuProps {
  track: Track;
  position: { x: number; y: number };
  onClose: () => void;
}

export function TrackActionMenu({ track, position, onClose }: TrackActionMenuProps) {
  const queryClient = useQueryClient();
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPlaylistsSubmenu, setShowPlaylistsSubmenu] = useState(false);

  const { addToQueue } = usePlayerStore();

  // Fetch playlists for "Add to Playlist" submenu
  const { data: playlists = [] } = useQuery({
    queryKey: ["playlists"],
    queryFn: playlistService.getPlaylists,
  });

  // Handle outside clicks to close the menu
  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  if (!mounted) return null;

  const handlePlayNext = () => {
    const { queue, currentIndex } = usePlayerStore.getState();
    const newQueue = [...queue];
    const existingIdx = newQueue.findIndex((t) => t.id === track.id);
    if (existingIdx >= 0) {
      newQueue.splice(existingIdx, 1);
    }
    const insertIdx = currentIndex + 1;
    newQueue.splice(insertIdx, 0, track);
    usePlayerStore.setState({ queue: newQueue });
    showToast(`"Play Next" queued: ${track.title}`);
    setTimeout(onClose, 800);
  };

  const handleAddToQueue = () => {
    addToQueue(track);
    showToast(`Added to queue: ${track.title}`);
    setTimeout(onClose, 800);
  };

  const handleCreatePlaylistFromMovie = async () => {
    if (!track.album?.id) return;
    try {
      const newPlaylist = await playlistService.createPlaylist({
        albumId: track.album.id,
      });
      // Invalidate queries to update playlists lists
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      showToast(`Created playlist "${newPlaylist.title}" from movie!`);
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error(err);
      showToast("Failed to create playlist from movie.");
    }
  };

  const handleAddToPlaylist = async (playlistId: string, playlistTitle: string) => {
    try {
      await playlistService.addTrackToPlaylist(playlistId, track.id);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      showToast(`Added to "${playlistTitle}"!`);
      setTimeout(onClose, 1000);
    } catch (err: any) {
      console.error(err);
      showToast("Track already in this playlist.");
    }
  };

  const handleToggleLike = async () => {
    const isLiked = track.isLiked;
    try {
      if (isLiked) {
        await musicService.unlikeTrack(track.id);
        showToast("Removed from Liked Songs");
      } else {
        await musicService.likeTrack(track.id);
        showToast("Added to Liked Songs");
      }
      queryClient.invalidateQueries({ queryKey: ["likedSongs"] });
      queryClient.invalidateQueries({ queryKey: ["album"] });
      queryClient.invalidateQueries({ queryKey: ["playlist"] });
      queryClient.invalidateQueries({ queryKey: ["trending-tracks"] });
      // In case this is the currently playing track
      const currentTrack = usePlayerStore.getState().currentTrack;
      if (currentTrack?.id === track.id) {
        usePlayerStore.getState().likeCurrentTrack();
      }
      setTimeout(onClose, 800);
    } catch (err) {
      console.error(err);
      showToast("Failed to update like status.");
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  // Adjust menu positioning to avoid going off-screen
  const menuWidth = 220;
  const menuHeight = 240;
  let posX = position.x;
  let posY = position.y;

  if (typeof window !== "undefined") {
    if (posX + menuWidth > window.innerWidth) {
      posX = window.innerWidth - menuWidth - 16;
    }
    if (posY + menuHeight > window.innerHeight) {
      posY = window.innerHeight - menuHeight - 16;
    }
  }

  return ReactDOM.createPortal(
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#1ed760] text-[#003913] font-bold text-sm px-6 py-3.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#4cf479]/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          {toastMessage}
        </div>
      )}

      {/* Dropdown Menu Panel */}
      <div
        ref={menuRef}
        style={{ top: posY, left: posX }}
        className="fixed w-[220px] rounded-2xl border border-white/10 bg-[#0c120c]/90 backdrop-blur-2xl p-2.5 shadow-2xl z-[90] text-white select-none"
      >
        <div className="px-3 py-2 border-b border-white/5 mb-1.5 flex gap-3 items-center">
          <div className="w-8 h-8 rounded bg-white/5 relative overflow-hidden flex-shrink-0">
            {track.artwork && (
              <img src={track.artwork} alt={track.title} className="object-cover w-full h-full" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate text-white">{track.title}</p>
            <p className="text-[10px] text-white/50 truncate">
              {track.artists.map((a) => a.name).join(", ")}
            </p>
          </div>
        </div>

        <button
          onClick={handleAddToQueue}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-xs text-white/80 hover:text-white rounded-lg transition-colors text-left"
        >
          <span className="material-symbols-outlined text-base">queue_music</span>
          Add to Queue
        </button>

        <button
          onClick={handlePlayNext}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-xs text-white/80 hover:text-white rounded-lg transition-colors text-left"
        >
          <span className="material-symbols-outlined text-base">play_arrow</span>
          Play Next
        </button>

        <button
          onClick={handleToggleLike}
          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-xs text-white/80 hover:text-white rounded-lg transition-colors text-left"
        >
          <span className="material-symbols-outlined text-base font-normal">
            {track.isLiked ? "heart_broken" : "favorite"}
          </span>
          {track.isLiked ? "Unlike Track" : "Like Track"}
        </button>

        {/* Existing Playlists Submenu */}
        <div className="relative">
          <button
            onMouseEnter={() => setShowPlaylistsSubmenu(true)}
            onClick={() => setShowPlaylistsSubmenu(!showPlaylistsSubmenu)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 text-xs text-white/80 hover:text-white rounded-lg transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-base">playlist_add</span>
              Add to Playlist
            </div>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>

          {showPlaylistsSubmenu && playlists.length > 0 && (
            <div
              onMouseLeave={() => setShowPlaylistsSubmenu(false)}
              className="absolute left-full top-0 ml-1 w-[180px] max-h-[160px] overflow-y-auto rounded-xl border border-white/10 bg-[#0c120c]/95 backdrop-blur-2xl p-1.5 shadow-2xl z-[100]"
            >
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => handleAddToPlaylist(playlist.id, playlist.title)}
                  className="w-full text-left truncate px-2.5 py-1.5 hover:bg-white/5 text-[11px] text-white/80 hover:text-white rounded-md transition-colors block"
                >
                  {playlist.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Movie/Soundtrack Action */}
        {track.album?.id && (
          <button
            onClick={handleCreatePlaylistFromMovie}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-xs text-[#4cf479] hover:text-[#69ff89] font-bold rounded-lg transition-colors text-left border-t border-white/5 mt-1.5 pt-2"
          >
            <span className="material-symbols-outlined text-base font-bold">movie</span>
            Create Playlist from Movie
          </button>
        )}
      </div>
    </>,
    document.body
  );
}
