import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Repeat, Repeat1, Shuffle, Heart } from 'lucide-react';

export function PlayerBar() {
  const { 
    currentTrack, 
    isPlaying, 
    volume, 
    progress, 
    duration,
    shuffleEnabled,
    repeatMode,
    togglePlayPause, 
    setVolume, 
    setProgress, 
    setDuration,
    playNext,
    playPrev,
    toggleShuffle,
    cycleRepeat,
    toggleLike,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  const subtitle = currentTrack?.artists && currentTrack.artists.length > 0 
    ? currentTrack.artists.map(a => a.name).join(', ')
    : currentTrack?.artist?.name || currentTrack?.album?.title || 'Unknown Artist';

  let imageUrl = currentTrack?.artwork || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentTrack?.title || 'Unknown')}&background=random&size=500`;
  imageUrl = imageUrl.replace(/50x50|150x150/g, '500x500');

  // Sync play/pause with audio element
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.play().catch(e => console.error("Playback failed:", e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Seek when progress is externally set (e.g., from playPrev restarting)
  useEffect(() => {
    if (audioRef.current && progress === 0 && currentTrack) {
      audioRef.current.currentTime = 0;
    }
  }, [progress, currentTrack]);

  const handleTimeUpdate = () => {
    if (audioRef.current) setProgress(audioRef.current.currentTime);
  };
  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };
  const handleEnded = () => playNext();

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const decodeHtml = (html: string) => {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  if (!currentTrack) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col">
        {/* Thin Progress Bar at very top of player */}
        <div className="w-full h-1 bg-surface/50 group cursor-pointer relative">
          <div 
            className="h-full bg-primary transition-all duration-100" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </div>

        <div className="h-[80px] glass-panel border-b-0 border-x-0 px-4 md:px-6 flex items-center justify-between shadow-[0_-8px_32px_rgba(0,0,0,0.4)] bg-surface/80 backdrop-blur-xl">
          
          {/* Left: Track Info + Like */}
          <div className="flex items-center gap-3 w-[30%] min-w-[180px]">
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 shadow-md">
              <img src={imageUrl} alt="Album Art" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col truncate min-w-0">
              <h4 className="text-sm font-bold text-foreground truncate">{decodeHtml(currentTrack.title)}</h4>
              <p className="text-xs text-text-secondary truncate">{decodeHtml(subtitle)}</p>
            </div>
            <button 
              onClick={() => toggleLike(currentTrack.id)}
              className={`shrink-0 ml-1 transition-colors ${currentTrack.isLiked ? 'text-red-500' : 'text-text-secondary hover:text-foreground'}`}
            >
              <Heart className={`w-4 h-4 ${currentTrack.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>

          {/* Center: Controls + Progress */}
          <div className="flex flex-col items-center justify-center w-[40%] max-w-[600px] gap-1">
            <div className="flex items-center gap-5">
              <button 
                onClick={toggleShuffle}
                className={`transition-colors hidden sm:block ${shuffleEnabled ? 'text-primary' : 'text-text-secondary hover:text-foreground'}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={playPrev} className="text-text-secondary hover:text-foreground transition-colors">
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button 
                onClick={togglePlayPause}
                className="w-9 h-9 flex items-center justify-center bg-foreground text-background rounded-full hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button onClick={playNext} className="text-text-secondary hover:text-foreground transition-colors">
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
              <button 
                onClick={cycleRepeat}
                className={`transition-colors hidden sm:block ${repeatMode !== 'off' ? 'text-primary' : 'text-text-secondary hover:text-foreground'}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2 w-full">
              <span className="text-[10px] text-text-secondary w-8 text-right font-mono">{formatTime(progress)}</span>
              <input 
                type="range" min={0} max={duration || 100} value={progress}
                onChange={handleSeek}
                className="flex-1 h-1 bg-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-primary transition-all"
              />
              <span className="text-[10px] text-text-secondary w-8 font-mono">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Volume */}
          <div className="flex items-center justify-end gap-2 w-[30%] min-w-[100px] hidden md:flex">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="text-text-secondary hover:text-foreground transition-colors"
            >
              <VolumeIcon className="w-4 h-4" />
            </button>
            <input 
              type="range" min={0} max={1} step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-primary transition-all"
            />
          </div>
        </div>
      </div>
    </>
  );
}
