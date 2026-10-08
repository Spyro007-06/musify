'use client';

import * as React from 'react';
import { Volume2, Radio, Check, Info, Blend, Mic } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { usePlayerStore } from '@/stores/player-store';
import { getAudioEngine } from '@/lib/audio/audio-engine';
import { MAX_CROSSFADE_SECONDS } from '@/lib/player/player-constants';

interface PlaybackSettingsInfoProps {
  className?: string;
}

export function PlaybackSettingsInfo({ className }: PlaybackSettingsInfoProps) {
  const crossfade = usePlayerStore((s) => s.crossfadeSeconds);
  const setCrossfade = usePlayerStore((s) => s.setCrossfade);
  const djEnabled = usePlayerStore((s) => s.djEnabled);
  const setDjEnabled = usePlayerStore((s) => s.setDjEnabled);
  const [canSpeak, setCanSpeak] = React.useState(true);
  React.useEffect(() => setCanSpeak('speechSynthesis' in window), []);
  // Checked after mount: it depends on the browser (iOS doesn't let pages set volume).
  const [canFade, setCanFade] = React.useState(true);
  React.useEffect(() => setCanFade(getAudioEngine().supportsCrossfade()), []);

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 space-y-6',
        className
      )}
    >
      <div className="border-b border-white/5 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-400 mb-1">
          <Volume2 className="h-3.5 w-3.5" />
          Audio & Streaming Engine
        </div>
        <h2 className="text-xl font-bold text-white">Playback Configuration</h2>
        <p className="text-xs text-neutral-400">
          Real-time audio engine settings and streaming configuration for your active sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Streaming Bitrate Card */}
        <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Streaming Bitrate</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-400 border border-brand-500/20">
              <Check className="h-3 w-3" />
              Up to 320 kbps
            </span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Songs play at 320 kbps. If your connection keeps stalling, playback switches to 160 kbps so the music
            doesn&apos;t stutter, until you reload the app.
          </p>
        </div>

        {/* Global Player Architecture Card */}
        <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Playback Engine</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-400 border border-brand-500/20">
              <Radio className="h-3 w-3" />
              Singleton AudioEngine
            </span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Persistent HTML5 audio runtime keeps your playback uninterrupted across route transitions and page navigations.
          </p>
        </div>
      </div>

      {/* Crossfade */}
      <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="crossfade" className="flex items-center gap-2 text-xs font-semibold text-white">
            <Blend className="h-3.5 w-3.5 text-brand-400" />
            Crossfade
          </label>
          <span className="text-xs font-semibold tabular-nums text-neutral-300" aria-hidden="true">
            {crossfade === 0 || !canFade ? 'Off' : `${crossfade} s`}
          </span>
        </div>
        <input
          id="crossfade"
          type="range"
          min={0}
          max={MAX_CROSSFADE_SECONDS}
          step={1}
          value={canFade ? crossfade : 0}
          disabled={!canFade}
          onChange={(e) => setCrossfade(Number(e.target.value))}
          aria-valuetext={crossfade === 0 ? 'Off' : `${crossfade} seconds`}
          className="w-full brand-brand-500 disabled:opacity-40"
        />
        <p className="text-xs text-neutral-400 leading-relaxed">
          {canFade
            ? 'Blend the end of each song into the next. The next song is always buffered early, so even with crossfade off there is no gap between tracks.'
            : "This browser doesn't let websites change playback volume, so crossfade isn't available here. Songs still play back to back without a gap."}
        </p>
      </div>

      {/* AI DJ */}
      <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="ai-dj" className="flex items-center gap-2 text-xs font-semibold text-white">
            <Mic className="h-3.5 w-3.5 text-brand-400" />
            AI DJ
          </label>
          <button
            id="ai-dj"
            type="button"
            role="switch"
            aria-checked={djEnabled && canSpeak}
            disabled={!canSpeak}
            onClick={() => setDjEnabled(!djEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-40 ${djEnabled && canSpeak ? 'bg-brand-500' : 'bg-neutral-800'}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${djEnabled && canSpeak ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          {canSpeak
            ? 'A short spoken intro as songs come on by themselves ("A 2013 Hindi classic now: Tum Hi Ho, from Aashiqui 2"), in your phone’s own voice, on every other song. The music dips while it talks.'
            : "This browser can't speak, so the DJ isn't available here."}
        </p>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl bg-neutral-950/60 p-4 border border-white/5 text-xs text-neutral-400">
        <Info className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Playback volume, mute toggles, and repeat modes are dynamically preserved in your active browser session via Zustand local memory.
        </p>
      </div>
    </div>
  );
}
