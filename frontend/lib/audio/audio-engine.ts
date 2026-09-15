export type AudioEngineEvents = {
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onWaiting?: () => void;
  onPlaying?: () => void;
};

export class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private events: AudioEngineEvents = {};
  private currentSrc: string = '';

  constructor(events: AudioEngineEvents = {}) {
    this.events = events;
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = 'metadata';
      this.setupListeners();
    }
  }

  public updateEvents(events: AudioEngineEvents) {
    this.events = { ...this.events, ...events };
  }

  private setupListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('timeupdate', () => {
      this.events.onTimeUpdate?.(this.audio?.currentTime || 0);
    });

    this.audio.addEventListener('durationchange', () => {
      const dur = this.audio?.duration;
      if (dur && !isNaN(dur) && isFinite(dur)) {
        this.events.onDurationChange?.(dur);
      }
    });

    this.audio.addEventListener('ended', () => {
      this.events.onEnded?.();
    });

    this.audio.addEventListener('play', () => {
      this.events.onPlay?.();
    });

    this.audio.addEventListener('pause', () => {
      this.events.onPause?.();
    });

    this.audio.addEventListener('waiting', () => {
      this.events.onWaiting?.();
    });

    this.audio.addEventListener('playing', () => {
      this.events.onPlaying?.();
    });

    this.audio.addEventListener('error', () => {
      const mediaError = this.audio?.error;
      const message = mediaError?.message || 'Playback stream encountered an error.';
      this.events.onError?.(new Error(message));
    });
  }

  public load(src: string) {
    if (!this.audio) return;
    if (this.currentSrc === src && this.audio.src) {
      return;
    }
    this.currentSrc = src;
    this.audio.src = src;
    this.audio.load();
  }

  public async play(): Promise<boolean> {
    if (!this.audio) return false;
    try {
      await this.audio.play();
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError') {
        // Autoplay policy prevented playback until user interaction
        console.warn('Autoplay restriction prevented playback. User interaction required.');
      } else if (error.name !== 'AbortError') {
        this.events.onError?.(error);
      }
      return false;
    }
  }

  public pause() {
    if (!this.audio) return;
    this.audio.pause();
  }

  public seek(seconds: number) {
    if (!this.audio) return;
    const clamped = Math.max(0, Math.min(seconds, this.audio.duration || seconds));
    this.audio.currentTime = clamped;
  }

  public setVolume(volume: number) {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  public setMuted(muted: boolean) {
    if (!this.audio) return;
    this.audio.muted = muted;
  }

  public getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  public getDuration(): number {
    return this.audio?.duration || 0;
  }

  public isPaused(): boolean {
    return this.audio?.paused ?? true;
  }

  public destroy() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.src = '';
    this.audio = null;
  }
}

// Global audio engine singleton instance for application lifecycle
let globalAudioEngine: AudioEngine | null = null;

export function getAudioEngine(events?: AudioEngineEvents): AudioEngine {
  if (!globalAudioEngine) {
    globalAudioEngine = new AudioEngine(events);
  } else if (events) {
    globalAudioEngine.updateEvents(events);
  }
  return globalAudioEngine;
}
