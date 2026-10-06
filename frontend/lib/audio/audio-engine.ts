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

// A zero-length WAV: played once inside the user's first tap so both audio
// elements are allowed to start later without one (iOS asks per element).
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

// A stall shorter than this is just a hiccup, not a sign the stream is too heavy.
const STALL_MS = 1000;
const STALLS_BEFORE_DOWNGRADE = 2;

/** JioSaavn serves each song at several bitrates under the same path: …_320.mp4, …_160.mp4. */
export function lowerBitrate(src: string): string {
  return src.replace(/_320\.mp4(?=$|\?)/, '_160.mp4');
}

interface Fade {
  from: HTMLAudioElement;
  start: number;
  ms: number;
}

/**
 * Two audio elements, one "active" (the only one whose events reach the
 * app) and one standby. The standby buffers the next song so switching to
 * it is instant (gapless), or plays it while the active one fades out
 * (crossfade). Anything the browser won't allow falls back to the plain
 * one-element path: a refused start on the standby reloads the song on the
 * element that was already playing.
 */
export class AudioEngine {
  private elements: HTMLAudioElement[] = [];
  private activeIndex = 0;
  private events: AudioEngineEvents = {};
  private currentSrc = '';
  private preloadedSrc = '';
  private volume = 1;
  private muted = false;
  private fade: Fade | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private crossfadeNextLoadMs = 0;
  /** The last load() switched elements, so a refused play() can fall back. */
  private switchedOnLoad = false;
  /** iOS ignores audio.volume, so a fade there would just overlap two songs. */
  private readonly volumeIsSettable: boolean = false;
  /**
   * Set after STALLS_BEFORE_DOWNGRADE real stalls in one song (a crowded
   * Wi-Fi or a weak signal): from then on songs play from JioSaavn's 160 kbps
   * file, half the 320's size. ponytail: one-way for the page session; probe
   * back up after some clean songs if users on good networks get stuck on it.
   */
  private lowBandwidth = false;
  private stallsThisSong = 0;
  private stallStartedAt = 0;

  constructor(events: AudioEngineEvents = {}) {
    this.events = events;
    if (typeof window === 'undefined') return;

    this.elements = [new Audio(), new Audio()];
    for (const el of this.elements) {
      el.preload = 'metadata';
      this.setupListeners(el);
    }
    const probe = new Audio();
    probe.volume = 0.5;
    this.volumeIsSettable = probe.volume === 0.5;

    const prime = () => {
      for (const el of this.elements) {
        if (el.src) continue;
        el.src = SILENT_WAV;
        el.play()
          .then(() => {
            if (el.src === SILENT_WAV) el.pause(); // unless a real song was loaded meanwhile
          })
          .catch(() => {});
      }
    };
    document.addEventListener('pointerdown', prime, { once: true, capture: true });
    document.addEventListener('keydown', prime, { once: true, capture: true });
  }

  private get audio(): HTMLAudioElement | null {
    return this.elements[this.activeIndex] ?? null;
  }

  private get standby(): HTMLAudioElement | null {
    return this.elements[1 - this.activeIndex] ?? null;
  }

  public updateEvents(events: AudioEngineEvents) {
    this.events = { ...this.events, ...events };
  }

  /** Whether crossfading can work in this browser (volume is controllable). */
  public supportsCrossfade(): boolean {
    return this.volumeIsSettable;
  }

  private setupListeners(el: HTMLAudioElement) {
    // The silent priming clip's events (play, pause, ended) aren't the app's business.
    const isActive = () => el === this.audio && el.src !== SILENT_WAV;

    el.addEventListener('timeupdate', () => {
      if (!isActive()) return;
      // Fade steps also ride on timeupdate: it keeps firing with the screen
      // off, when the interval timer gets throttled.
      if (this.fade) this.stepFade();
      this.events.onTimeUpdate?.(el.currentTime || 0);
    });

    el.addEventListener('durationchange', () => {
      if (isActive() && Number.isFinite(el.duration) && el.duration > 0) this.events.onDurationChange?.(el.duration);
    });

    el.addEventListener('ended', () => {
      if (isActive()) this.events.onEnded?.();
      else if (this.fade?.from === el) this.endFade();
    });

    el.addEventListener('play', () => {
      if (isActive()) this.events.onPlay?.();
    });

    el.addEventListener('pause', () => {
      if (isActive()) this.events.onPause?.();
    });

    el.addEventListener('waiting', () => {
      if (!isActive()) return;
      // Mid-song only: buffering at the start or after a seek is expected.
      if (!el.seeking && el.currentTime > 1) this.stallStartedAt = performance.now();
      this.events.onWaiting?.();
    });

    el.addEventListener('playing', () => {
      if (!isActive()) return;
      if (this.stallStartedAt && performance.now() - this.stallStartedAt >= STALL_MS) {
        if (++this.stallsThisSong >= STALLS_BEFORE_DOWNGRADE) this.downgrade(el);
      }
      this.stallStartedAt = 0;
      this.events.onPlaying?.();
    });

    el.addEventListener('error', () => {
      if (el.src === SILENT_WAV) return;
      if (!isActive()) {
        // A failed preload: don't switch to this element for that song.
        if (el === this.standby) this.preloadedSrc = '';
        return;
      }
      const message = el.error?.message || 'Playback stream encountered an error.';
      this.events.onError?.(new Error(message));
    });
  }

  /** The next load() crossfades for this long instead of cutting (0 = cut). */
  public armCrossfade(seconds: number) {
    this.crossfadeNextLoadMs = this.volumeIsSettable ? Math.max(0, seconds) * 1000 : 0;
  }

  /** Buffers the next song on the standby element so switching to it is instant. */
  public preload(src: string) {
    const standby = this.standby;
    if (!standby || this.fade || src === this.currentSrc || src === this.preloadedSrc) return;
    // Downloading the next song while this one still is splits the
    // bandwidth, and on a slow connection the playing song stutters.
    if (!this.activeFullyBuffered()) return;
    standby.preload = 'auto';
    standby.src = this.sourceFor(src);
    standby.load();
    this.preloadedSrc = src;
  }

  private sourceFor(src: string): string {
    return this.lowBandwidth ? lowerBitrate(src) : src;
  }

  private activeFullyBuffered(): boolean {
    const audio = this.audio;
    if (!audio || !Number.isFinite(audio.duration)) return false;
    const { buffered } = audio;
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= audio.currentTime && buffered.end(i) >= audio.duration - 1) return true;
    }
    return false;
  }

  /** Too many stalls: carry on from the same spot in the lighter file, and stay on it. */
  private downgrade(el: HTMLAudioElement) {
    this.lowBandwidth = true;
    const lighter = lowerBitrate(el.src);
    if (lighter === el.src) return;
    const at = el.currentTime;
    el.src = lighter;
    el.currentTime = at;
    el.play().catch(() => {});
  }

  public load(src: string) {
    const outgoing = this.audio;
    if (!outgoing) return;
    if (this.currentSrc === src && outgoing.src) return;

    const fadeMs = this.crossfadeNextLoadMs;
    this.crossfadeNextLoadMs = 0;
    this.endFade();
    this.stallsThisSong = 0;
    this.stallStartedAt = 0;

    const wasPreloaded = src === this.preloadedSrc;
    this.switchedOnLoad = wasPreloaded || (fadeMs > 0 && !outgoing.paused);
    if (this.switchedOnLoad) {
      this.activeIndex = 1 - this.activeIndex;
      const incoming = this.audio!;
      if (!wasPreloaded) {
        incoming.src = this.sourceFor(src);
        incoming.load();
      }
      incoming.currentTime = 0;
      if (fadeMs > 0 && !outgoing.paused) this.startFade(outgoing, fadeMs);
      else outgoing.pause();
      if (Number.isFinite(incoming.duration) && incoming.duration > 0) {
        this.events.onDurationChange?.(incoming.duration);
      }
    } else {
      outgoing.src = this.sourceFor(src);
      outgoing.load();
    }

    this.preloadedSrc = '';
    this.currentSrc = src;
    this.applyVolumes();
  }

  public async play(): Promise<boolean> {
    const audio = this.audio;
    if (!audio) return false;
    try {
      await audio.play();
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError' && this.switchedOnLoad) {
        // This browser won't start the other element without a tap: play the
        // song on the element that was already playing, as before.
        this.switchedOnLoad = false;
        this.endFade();
        audio.removeAttribute('src');
        this.activeIndex = 1 - this.activeIndex;
        const fallback = this.audio!;
        fallback.src = this.sourceFor(this.currentSrc);
        fallback.load();
        this.applyVolumes();
        return this.play();
      }
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
    this.endFade();
    this.audio.pause();
  }

  public seek(seconds: number) {
    const audio = this.audio;
    if (!audio) return;
    this.endFade();
    const clamped = Math.max(0, Math.min(seconds, audio.duration || seconds));
    audio.currentTime = clamped;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyVolumes();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.applyVolumes();
  }

  public getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  public getDuration(): number {
    return this.audio?.duration || 0;
  }

  /** The loaded source itself failed (bad URL, unsupported) — unlike a blocked autoplay. */
  public hasError(): boolean {
    return Boolean(this.audio?.error);
  }

  public isPaused(): boolean {
    return this.audio?.paused ?? true;
  }

  public destroy() {
    this.endFade();
    for (const el of this.elements) {
      el.pause();
      el.src = '';
    }
    this.elements = [];
  }

  private startFade(from: HTMLAudioElement, ms: number) {
    this.fade = { from, start: performance.now(), ms };
    this.fadeTimer = setInterval(() => this.stepFade(), 50);
  }

  private stepFade() {
    if (!this.fade) return;
    if (performance.now() - this.fade.start >= this.fade.ms) this.endFade();
    else this.applyVolumes();
  }

  /** Finishes any fade at once: the outgoing song stops, the new one is at full volume. */
  private endFade() {
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    this.fadeTimer = null;
    if (!this.fade) return;
    const { from } = this.fade;
    this.fade = null;
    from.pause();
    this.applyVolumes();
  }

  /** Equal-power fade: the combined loudness stays even through the overlap. */
  private applyVolumes() {
    const base = this.muted ? 0 : this.volume;
    const progress = this.fade ? Math.min(1, (performance.now() - this.fade.start) / this.fade.ms) : 1;
    for (const el of this.elements) {
      el.muted = this.muted;
      if (el === this.audio) el.volume = base * Math.sin((progress * Math.PI) / 2);
      else if (this.fade?.from === el) el.volume = base * Math.cos((progress * Math.PI) / 2);
    }
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
