"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/features/player/store/player-store";
import type { Track } from "@/types/music";

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);

  const prevTrackId = useRef<string | null>(null);
  const activeStreamUrl = useRef<string | null>(null);

  const playStartRef = useRef<number | null>(null);
  const trackRef = useRef<Track | null>(null);

  // Send history log when track changes
  useEffect(() => {
    if (trackRef.current) {
      const durationPlayed = playStartRef.current ? Math.round((Date.now() - playStartRef.current) / 1000) : 0;
      const totalDuration = trackRef.current.duration || 180;
      const pct = Math.min(Math.round((durationPlayed / totalDuration) * 100), 100);
      const isCompleted = pct >= 90;
      const isSkip = pct < 20;

      // Send log to backend
      import("@/shared/services/api-client").then(({ apiClient }) => {
        apiClient.post("/user/history", {
          spotifyTrackId: trackRef.current!.id,
          albumId: trackRef.current!.album?.id,
          artistId: trackRef.current!.artists?.[0]?.name,
          genre: trackRef.current!.genre,
          device: "Web",
          sessionDuration: durationPlayed,
          listenPercentage: pct,
          completedSong: isCompleted,
        }).catch(() => {});

        if (isSkip) {
          apiClient.post("/recommendations/feedback", {
            trackId: trackRef.current!.id,
            action: "skip",
            duration: totalDuration,
            skipTime: durationPlayed,
          }).catch(() => {});
        } else if (isCompleted) {
          apiClient.post("/recommendations/feedback", {
            trackId: trackRef.current!.id,
            action: "complete",
          }).catch(() => {});
        }
      });
    }

    if (currentTrack) {
      trackRef.current = currentTrack;
      playStartRef.current = Date.now();
    } else {
      trackRef.current = null;
      playStartRef.current = null;
    }
  }, [currentTrack]);

  // Handle page unload tracking
  useEffect(() => {
    const handleUnload = () => {
      if (trackRef.current) {
        const durationPlayed = playStartRef.current ? Math.round((Date.now() - playStartRef.current) / 1000) : 0;
        const totalDuration = trackRef.current.duration || 180;
        const pct = Math.min(Math.round((durationPlayed / totalDuration) * 100), 100);
        const isCompleted = pct >= 90;

        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        if (token) {
          fetch("http://localhost:3001/api/user/history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              spotifyTrackId: trackRef.current!.id,
              albumId: trackRef.current!.album?.id,
              artistId: trackRef.current!.artists?.[0]?.name,
              genre: trackRef.current!.genre,
              device: "Web",
              sessionDuration: durationPlayed,
              listenPercentage: pct,
              completedSong: isCompleted,
            }),
            keepalive: true
          });
        }
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  // Play / pause whenever track or isPlaying changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    import("@/features/player/services/audio").then(({ audioManager }) => {
      if (!currentTrack) {
        audioManager.stop();
        prevTrackId.current = null;
        activeStreamUrl.current = null;
        return;
      }

      if (prevTrackId.current !== currentTrack.id) {
        prevTrackId.current = currentTrack.id;
        activeStreamUrl.current = null;

        import("@/services/music").then(({ musicService }) => {
          musicService
            .getStreamUrl(currentTrack.id)
            .then((streamUrl) => {
              activeStreamUrl.current = streamUrl;
              audioManager.play(currentTrack.id, streamUrl);
            })
            .catch(() => {
              activeStreamUrl.current = currentTrack.audioUrl;
              audioManager.play(currentTrack.id, currentTrack.audioUrl);
            });
        });
      } else {
        if (isPlaying) {
          audioManager.play(currentTrack.id, activeStreamUrl.current || currentTrack.audioUrl);
        } else {
          audioManager.pause();
        }
      }
    });
  }, [currentTrack, isPlaying]);

  // Sync volume changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("@/features/player/services/audio").then(({ audioManager }) => {
      audioManager.setVolume(volume);
    });
  }, [volume]);

  // Sync mute
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("@/features/player/services/audio").then(({ audioManager }) => {
      audioManager.mute(isMuted);
    });
  }, [isMuted]);

  return <>{children}</>;
}
