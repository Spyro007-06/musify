export type AudioEngineEvents = {
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onPlay?: () => void;
  onPause?: () => void;
};

export class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private events: AudioEngineEvents = {};

  constructor(events: AudioEngineEvents = {}) {
    this.events = events;
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.setupListeners();
    }
  }

  private setupListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('timeupdate', () => {
      this.events.onTimeUpdate?.(this.audio?.currentTime || 0);
    });

    this.audio.addEventListener('durationchange', () => {
      this.events.onDurationChange?.(this.audio?.duration || 0);
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

    this.audio.addEventListener('error', () => {
      this.events.onError?.(new Error('Audio playback error'));
    });
  }

  public load(src: string) {
    if (!this.audio) return;
    this.audio.src = src;
    this.audio.load();
  }

  public async play() {
    if (!this.audio) return;
    try {
      await this.audio.play();
    } catch (err) {
      this.events.onError?.(err as Error);
    }
  }

  public pause() {
    if (!this.audio) return;
    this.audio.pause();
  }

  public seek(seconds: number) {
    if (!this.audio) return;
    this.audio.currentTime = seconds;
  }

  public setVolume(volume: number) {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  public destroy() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.src = '';
    this.audio = null;
  }
}
