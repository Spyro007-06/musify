'use client';

import * as React from 'react';
import { Volume2, Radio, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface PlaybackSettingsInfoProps {
  className?: string;
}

export function PlaybackSettingsInfo({ className }: PlaybackSettingsInfoProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 space-y-6',
        className
      )}
    >
      <div className="border-b border-white/5 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
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
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
              <Check className="h-3 w-3" />
              High Quality (320 kbps)
            </span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Streams are served directly from the JioSaavn catalog at the highest available bitrates for maximum acoustic clarity.
          </p>
        </div>

        {/* Global Player Architecture Card */}
        <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Playback Engine</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold text-purple-400 border border-purple-500/20">
              <Radio className="h-3 w-3" />
              Singleton AudioEngine
            </span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Persistent HTML5 audio runtime keeps your playback uninterrupted across route transitions and page navigations.
          </p>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 rounded-xl bg-neutral-950/60 p-4 border border-white/5 text-xs text-neutral-400">
        <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Playback volume, mute toggles, and repeat modes are dynamically preserved in your active browser session via Zustand local memory.
        </p>
      </div>
    </div>
  );
}
