"use client";

import { usePlayerStore } from "@/features/player/store/player-store";

// Dynamically resolved Howler instance — avoids SSR issues
let HowlClass: typeof import("howler").Howl | null = null;

async function getHowl() {
  if (typeof window === "undefined") return null;
  if (!HowlClass) {
    const { Howl } = await import("howler");
    HowlClass = Howl;
  }
  return HowlClass;
}

class AudioManager {
  private activeHowl: any = null;
  private currentTrackId: string | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  async play(trackId: string, url: string) {
    const Howl = await getHowl();
    if (!Howl) return;

    if (this.currentTrackId === trackId && this.activeHowl) {
      if (!this.activeHowl.playing()) {
        this.activeHowl.play();
        usePlayerStore.setState({ isPlaying: true });
        this.startProgressTracker();
      }
      return;
    }

    // Stop & unload current
    this.stop();

    this.currentTrackId = trackId;
    const store = usePlayerStore.getState();

    this.activeHowl = new Howl({
      src: [url],
      html5: true,
      volume: store.isMuted ? 0 : store.volume / 100,
      onplay: () => {
        usePlayerStore.setState({
          isPlaying: true,
          duration: this.activeHowl?.duration() || 0,
        });
        this.startProgressTracker();
        this.updateMediaSession();
      },
      onpause: () => {
        usePlayerStore.setState({ isPlaying: false });
        this.stopProgressTracker();
      },
      onstop: () => {
        usePlayerStore.setState({ isPlaying: false, progress: 0 });
        this.stopProgressTracker();
      },
      onend: () => {
        usePlayerStore.setState({ isPlaying: false, progress: 100 });
        this.stopProgressTracker();
        // Auto-advance queue
        setTimeout(() => {
          usePlayerStore.getState().nextTrack();
        }, 300);
      },
      onloaderror: (_id: any, error: any) => {
        console.error("[Musify AudioManager] Load error:", error);
        usePlayerStore.setState({ isPlaying: false });
      },
      onplayerror: (_id: any, error: any) => {
        console.error("[Musify AudioManager] Play error:", error);
        if (this.activeHowl) {
          this.activeHowl.once("unlock", () => {
            this.activeHowl?.play();
          });
        }
      },
    });

    this.activeHowl.play();
  }

  pause() {
    if (this.activeHowl?.playing()) {
      this.activeHowl.pause();
    }
  }

  stop() {
    if (this.activeHowl) {
      this.activeHowl.stop();
      this.activeHowl.unload();
      this.activeHowl = null;
    }
    this.currentTrackId = null;
    this.stopProgressTracker();
  }

  seek(progressPercent: number) {
    if (!this.activeHowl) return;
    const duration = this.activeHowl.duration() as number;
    const position = (progressPercent / 100) * duration;
    this.activeHowl.seek(position);
    usePlayerStore.setState({ progress: progressPercent });
  }

  setVolume(volumePercent: number) {
    if (this.activeHowl) {
      this.activeHowl.volume(volumePercent / 100);
    }
  }

  mute(shouldMute: boolean) {
    if (this.activeHowl) {
      this.activeHowl.mute(shouldMute);
    }
  }

  private startProgressTracker() {
    this.stopProgressTracker();
    this.updateInterval = setInterval(() => {
      if (this.activeHowl?.playing()) {
        const seek = this.activeHowl.seek() as number;
        const duration = this.activeHowl.duration() as number;
        if (duration > 0) {
          usePlayerStore.setState({ progress: (seek / duration) * 100 });
        }
      }
    }, 250);
  }

  private stopProgressTracker() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateMediaSession() {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    const track = usePlayerStore.getState().currentTrack;
    if (!track) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album?.title || "Musify",
      artwork: track.artwork
        ? [
            { src: track.artwork, sizes: "512x512", type: "image/jpeg" },
          ]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      this.activeHowl?.play();
      usePlayerStore.setState({ isPlaying: true });
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      this.activeHowl?.pause();
      usePlayerStore.setState({ isPlaying: false });
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      usePlayerStore.getState().prevTrack();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      usePlayerStore.getState().nextTrack();
    });
  }

  getAudioElement(): HTMLMediaElement | null {
    if (this.activeHowl && this.activeHowl._sounds && this.activeHowl._sounds[0]) {
      return this.activeHowl._sounds[0]._node || null;
    }
    return null;
  }
}

export const audioManager = new AudioManager();
export default audioManager;
