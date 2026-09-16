'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { getAudioEngine } from '@/lib/audio/audio-engine';

/**
 * useAudio wires the singleton AudioEngine to the Zustand player store.
 * It should be mounted once at the top level of the player (in GlobalPlayer).
 */
export function useAudio() {
  const isInitialized = useRef(false);

  const {
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setError,
    nextTrack,
  } = usePlayerStore();

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const engine = getAudioEngine({
      onTimeUpdate: (time) => {
        setCurrentTime(time);
      },
      onDurationChange: (dur) => {
        if (dur > 0 && isFinite(dur)) {
          setDuration(dur);
        }
      },
      onEnded: () => {
        nextTrack('ended');
      },
      onPlay: () => {
        setIsPlaying(true);
      },
      onPause: () => {
        setIsPlaying(false);
      },
      onError: (err) => {
        setError(err.message || 'Audio playback error occurred.');
      },
    });

    // Cleanup on unmount
    return () => {
      // Keep persistent audio engine across soft navigation, but release listeners if destroyed
    };
  }, [setCurrentTime, setDuration, setIsPlaying, setError, nextTrack]);
}
