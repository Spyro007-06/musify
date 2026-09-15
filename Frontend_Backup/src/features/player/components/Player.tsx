"use client";

import Image from "next/image";
import Link from "next/link";
import { usePlayerStore } from "@/features/player/store/player-store";
import { Slider } from "@/shared/components/ui/Slider";
import { formatDuration } from "@/shared/utils/utils";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/shared/utils/utils";
import { useDownloadsStore } from "@/features/player/store/downloads-store";
import { useState, useEffect } from "react";
import { TrackActionMenu } from "@/shared/components/ui/TrackActionMenu";
import dynamic from "next/dynamic";
import { FastAverageColor } from "fast-average-color";

const WaveSurferVisualizer = dynamic(
  () => import("./WaveSurferVisualizer").then((mod) => mod.WaveSurferVisualizer),
  { ssr: false }
);

export function Player() {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    repeat,
    shuffle,
    progress,
    duration,
    isQueueOpen,
    isLyricsOpen,
    isExpanded,
    togglePlay,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setProgress,
    toggleQueue,
    toggleLyrics,
    toggleExpanded,
    likeCurrentTrack,
    setAccentColor,
  } = usePlayerStore();

  const { downloadedTracks, isDownloadingMap, downloadTrack } = useDownloadsStore();

  useEffect(() => {
    if (currentTrack?.artwork) {
      const fac = new FastAverageColor();
      fac.getColorAsync(currentTrack.artwork, { crossOrigin: 'anonymous' })
        .then(color => {
          setAccentColor(color.hex);
        })
        .catch(e => {
          console.error(e);
          setAccentColor(null);
        });
    } else {
      setAccentColor(null);
    }
  }, [currentTrack?.artwork, setAccentColor]);
  const isDownloaded = currentTrack ? downloadedTracks.some((t) => t.id === currentTrack.id) : false;
  const isDownloading = currentTrack ? !!isDownloadingMap[currentTrack.id] : false;

  const [activeTrack, setActiveTrack] = useState<any | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!currentTrack) return null;

  const handleSeek = (value: number) => {
    if (typeof window === "undefined") return;
    import("@/features/player/services/audio").then(({ audioManager }) => {
      audioManager.seek(value);
    });
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
  };

  const handleMuteClick = () => {
    toggleMute();
  };

  const currentTime = (progress / 100) * duration;

  return (
    <>
      <footer className="fixed bottom-0 left-0 w-full h-16 sm:h-24 z-50 bg-[#0d150d]/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_20px_rgba(0,0,0,0.4)] flex items-center justify-between px-4 sm:px-6 select-none">
        {/* Now Playing info */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 sm:flex-none sm:w-1/3 min-w-0 pr-2">
          <div
            onClick={toggleExpanded}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-md sm:rounded-lg overflow-hidden flex-shrink-0 shadow-md cursor-pointer relative group"
          >
            {currentTrack?.artwork ? (
              <Image
                src={currentTrack.artwork}
                alt={currentTrack.title}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <span className="material-symbols-outlined text-white/20">music_note</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-lg">expand_less</span>
            </div>
          </div>
          <div className="flex flex-col min-w-0" onClick={toggleExpanded}>
            <h4
              className="font-semibold text-xs sm:text-sm text-white truncate cursor-pointer hover:underline"
            >
              {currentTrack.title}
            </h4>
            <p className="text-white/50 text-[10px] sm:text-xs truncate mt-0.5">
              {currentTrack.artists.map((a) => a?.name).join(", ")}
            </p>
          </div>
          <button
            onClick={likeCurrentTrack}
            className={cn(
              "transition-colors ml-auto sm:ml-4 flex-shrink-0",
              currentTrack.isLiked ? "text-[#4cf479]" : "text-white/60 hover:text-white"
            )}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: currentTrack.isLiked ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>

          <button
            onClick={() => downloadTrack(currentTrack)}
            disabled={isDownloading}
            className={cn(
              "transition-colors ml-3.5",
              isDownloaded ? "text-[#4cf479]" : "text-white/60 hover:text-white",
              isDownloading && "animate-pulse cursor-not-allowed"
            )}
            title={isDownloaded ? "Downloaded offline" : "Download offline"}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: isDownloaded ? "'FILL' 1" : "'FILL' 0" }}
            >
              {isDownloading ? "downloading" : isDownloaded ? "download_done" : "download"}
            </span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveTrack(currentTrack);
              setMenuPosition({ x: e.clientX, y: e.clientY - 260 });
            }}
            className="text-white/60 hover:text-white transition-colors ml-3.5 hidden sm:block"
            title="More actions"
          >
            <span className="material-symbols-outlined text-xl">more_horiz</span>
          </button>
        </div>

        {/* Mobile Controls */}
        <div className="flex sm:hidden items-center gap-3 flex-shrink-0">
          <button
            onClick={togglePlay}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-2xl">
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>
        </div>

        {/* Playback Controls (Desktop) */}
        <div className="hidden sm:flex flex-col items-center gap-2 w-1/3">
          <div className="flex items-center gap-6">
            <button
              onClick={toggleShuffle}
              className={cn(
                "transition-colors",
                shuffle ? "text-[#4cf479]" : "text-white/60 hover:text-white"
              )}
            >
              <span className="material-symbols-outlined text-xl">shuffle</span>
            </button>
            <button
              onClick={prevTrack}
              className="text-white hover:text-[#4cf479] transition-colors"
            >
              <span className="material-symbols-outlined text-3xl">skip_previous</span>
            </button>
            <button
              onClick={togglePlay}
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all neon-glow"
            >
              <span className="material-symbols-outlined text-3xl font-black">
                {isPlaying ? "pause" : "play_arrow"}
              </span>
            </button>
            <button
              onClick={nextTrack}
              className="text-white hover:text-[#4cf479] transition-colors"
            >
              <span className="material-symbols-outlined text-3xl">skip_next</span>
            </button>
            <button
              onClick={cycleRepeat}
              className={cn(
                "transition-colors relative",
                repeat !== "off" ? "text-[#4cf479]" : "text-white/60 hover:text-white"
              )}
            >
              <span className="material-symbols-outlined text-xl">
                {repeat === "one" ? "repeat_one" : "repeat"}
              </span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-3 w-full max-w-md">
            <span className="text-[10px] text-white/40 tabular-nums w-8 text-right">
              {formatDuration(currentTime)}
            </span>
            <Slider
              value={progress}
              onChange={handleSeek}
              className="flex-1 cursor-pointer"
            />
            <span className="text-[10px] text-white/40 tabular-nums w-8">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Volume & Queue Controls (Desktop) */}
        <div className="hidden sm:flex items-center justify-end gap-4 w-1/3">
          <button
            onClick={toggleQueue}
            className={cn(
              "transition-colors hidden sm:block",
              isQueueOpen ? "text-[#4cf479]" : "text-white/60 hover:text-white"
            )}
          >
            <span className="material-symbols-outlined">queue_music</span>
          </button>
          <button
            onClick={toggleLyrics}
            className={cn(
              "transition-colors hidden sm:block",
              isLyricsOpen ? "text-[#4cf479]" : "text-white/60 hover:text-white"
            )}
          >
            <span className="material-symbols-outlined">lyrics</span>
          </button>

          <div className="flex items-center gap-2 group/volume w-24">
            <button onClick={handleMuteClick} className="text-white/60 hover:text-white transition-colors">
              <span className="material-symbols-outlined">
                {isMuted || volume === 0 ? "volume_off" : volume < 50 ? "volume_down" : "volume_up"}
              </span>
            </button>
            <Slider
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full cursor-pointer opacity-60 group-hover/volume:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </footer>

      {/* Fullscreen Expanded Player */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-[#070b07] flex flex-col p-8 select-none"
          >
            {/* Ambient Background Glow */}
            {currentTrack.artwork && (
              <div className="absolute inset-0 z-0 opacity-30 blur-[150px] scale-125 pointer-events-none">
                <Image
                  src={currentTrack.artwork}
                  alt={currentTrack.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center mb-8">
              <button
                onClick={toggleExpanded}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined">expand_more</span>
              </button>
              <div className="text-center">
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-black">Playing From</span>
                <h5 className="text-xs font-bold text-white/80">{currentTrack.album?.title || "Queue"}</h5>
              </div>
              <div className="w-10" />
            </div>

            {/* Main Area */}
            <div className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto w-full items-center">
              {/* Left Side: Artwork */}
              <div className="flex flex-col items-center">
                <div className="relative aspect-square w-full max-w-[360px] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/10 group">
                  {currentTrack.artwork ? (
                    <Image
                      src={currentTrack.artwork}
                      alt={currentTrack.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/20 text-6xl">music_note</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Lyrics or Playlist Info */}
              <div className="flex flex-col h-[360px] justify-center">
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 line-clamp-2">
                  {currentTrack.title}
                </h2>
                <p className="text-lg text-white/60 font-bold mb-8">
                  {currentTrack.artists.map((a) => a?.name).join(", ")}
                </p>

                <WaveSurferVisualizer />

                <div className="flex gap-4 items-center justify-center">
                  <button
                    onClick={toggleLyrics}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-full border text-sm font-semibold transition-all duration-200",
                      isLyricsOpen
                        ? "bg-[#4cf479] text-[#003913] border-[#4cf479]"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    )}
                  >
                    <span className="material-symbols-outlined text-lg">mic</span>
                    Lyrics
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTrack(currentTrack);
                      setMenuPosition({ x: e.clientX, y: e.clientY - 260 });
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 text-sm font-semibold transition-all duration-200"
                  >
                    <span className="material-symbols-outlined text-lg">more_horiz</span>
                    Actions
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {activeTrack && (
        <TrackActionMenu
          track={activeTrack}
          position={menuPosition}
          onClose={() => setActiveTrack(null)}
        />
      )}
    </>
  );
}
export default Player;
