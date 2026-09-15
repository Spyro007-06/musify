"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { usePlayerStore } from "@/features/player/store/player-store";

export function WaveSurferVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const { currentTrack, isPlaying } = usePlayerStore();

  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    import("@/features/player/services/audio").then(({ audioManager }) => {
      const media = audioManager.getAudioElement();
      if (!media) return;

      waveSurferRef.current = WaveSurfer.create({
        container: containerRef.current!,
        waveColor: "rgba(255, 255, 255, 0.3)",
        progressColor: "#4cf479",
        cursorColor: "transparent",
        barWidth: 3,
        barGap: 3,
        barRadius: 3,
        height: 60,
        media: media,
      });
    });

    return () => {
      if (waveSurferRef.current) {
        waveSurferRef.current.destroy();
      }
    };
  }, [currentTrack]);

  return (
    <div className="w-full mt-4 mb-8">
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
