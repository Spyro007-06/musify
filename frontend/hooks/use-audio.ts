import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { AudioEngine } from '@/lib/player/audio-engine';

export function useAudio() {
  const engineRef = useRef<AudioEngine | null>(null);
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    setProgress,
    setDuration,
    nextTrack,
    play,
    pause,
  } = usePlayerStore();

  useEffect(() => {
    engineRef.current = new AudioEngine({
      onTimeUpdate: (time) => setProgress(time),
      onDurationChange: (dur) => setDuration(dur),
      onEnded: () => nextTrack(),
      onPlay: () => play(),
      onPause: () => pause(),
    });

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [setProgress, setDuration, nextTrack, play, pause]);

  // Load and play track changes
  useEffect(() => {
    if (!engineRef.current || !currentTrack) return;
    const src = currentTrack.audioUrl;
    if (src) {
      engineRef.current.load(src);
      if (isPlaying) {
        engineRef.current.play();
      }
    }
  }, [currentTrack]);

  // Control play/pause
  useEffect(() => {
    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.play();
    } else {
      engineRef.current.pause();
    }
  }, [isPlaying]);

  // Control volume
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  return {
    seek: (time: number) => engineRef.current?.seek(time),
  };
}
