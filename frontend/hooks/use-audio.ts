'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { getAudioEngine } from '@/lib/audio/audio-engine';
import imageLoader from '@/lib/image-loader';

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

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);

  // Keep the OS/lock-screen/hardware media widget (the screenshot's
  // "device player") in sync — without this it falls back to a generic
  // "MUSIFY - Music Streaming" title and a static, non-moving progress bar.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
      album: currentTrack.album?.title || '',
      artwork: currentTrack.artwork
        ? [150, 500].map((size) => ({
            src: imageLoader({ src: currentTrack.artwork!, width: size }),
            sizes: `${size}x${size}`,
            type: 'image/jpeg',
          }))
        : [],
    });
  }, [currentTrack]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!duration || !isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      // Some browsers throw if position/duration are momentarily out of sync mid-track-change.
    }
  }, [duration, currentTime]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    // Explicit play/pause, never toggle: with the screen off the store and
    // the OS can disagree, and a toggle then turns a "play" gesture into a pause.
    const { resume, pause, nextTrack: goNext, previousTrack, seek } = usePlayerStore.getState();
    navigator.mediaSession.setActionHandler('play', () => resume());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    // Some Bluetooth devices send "stop"; without a handler it ends the session.
    try {
      navigator.mediaSession.setActionHandler('stop', () => pause());
    } catch {
      // "stop" unsupported in this browser.
    }
    navigator.mediaSession.setActionHandler('previoustrack', () => previousTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => goNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) seek(details.seekTime);
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
      try {
        navigator.mediaSession.setActionHandler('stop', null);
      } catch {
        // "stop" unsupported in this browser.
      }
    };
  }, []);

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
      // playbackState is set here, straight from the audio element, not from a
      // React effect: effects can lag with the screen off, leaving the OS
      // showing a stale state and sending the wrong action.
      onPlay: () => {
        setIsPlaying(true);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      },
      onPause: () => {
        setIsPlaying(false);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
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
