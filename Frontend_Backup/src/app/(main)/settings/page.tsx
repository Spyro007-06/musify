"use client";

import { usePlayerStore } from "@/features/player/store/player-store";
import { Slider } from "@/shared/components/ui/Slider";
import { useState } from "react";

export default function SettingsPage() {
  const { volume, setVolume, repeat, cycleRepeat, shuffle, toggleShuffle } = usePlayerStore();
  const [audioQuality, setAudioQuality] = useState("high");

  return (
    <div className="space-y-12 max-w-2xl mx-auto select-none py-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Settings</h2>
        <p className="text-white/40 text-xs">Configure your playback environment, sound qualities and themes.</p>
      </div>

      <div className="space-y-6">
        {/* Playback settings card */}
        <div className="glass-card rounded-[24px] p-6 md:p-8 border border-white/5 space-y-6 shadow-2xl">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4cf479]">equalizer</span>
            Audio Playback
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-sm text-white/80 block">Default Volume</span>
                <span className="text-[10px] text-white/40">Adjust current output level.</span>
              </div>
              <span className="text-xs font-bold text-[#4cf479]">{volume}%</span>
            </div>
            <Slider value={volume} onChange={(val) => setVolume(val)} />
          </div>

          <div className="border-t border-white/5 pt-6 flex justify-between items-center">
            <div>
              <span className="font-semibold text-sm text-white/80 block">Stream Audio Quality</span>
              <span className="text-[10px] text-white/40">Higher bitrates require faster internet speeds.</span>
            </div>
            <select
              value={audioQuality}
              onChange={(e) => setAudioQuality(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-[#4cf479] text-xs font-bold"
            >
              <option value="low" className="bg-[#0b0b0f]">Low (96kbps)</option>
              <option value="medium" className="bg-[#0b0b0f]">Normal (160kbps)</option>
              <option value="high" className="bg-[#0b0b0f]">High Fidelity (320kbps)</option>
            </select>
          </div>
        </div>

        {/* Shortcuts / Quick toggles */}
        <div className="glass-card rounded-[24px] p-6 md:p-8 border border-white/5 space-y-6 shadow-2xl">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4cf479]">tune</span>
            Controls & Preferences
          </h3>

          <div className="flex justify-between items-center py-2">
            <div>
              <span className="font-semibold text-sm text-white/80 block">Shuffle Mode</span>
              <span className="text-[10px] text-white/40">Randomize upcoming playlist songs.</span>
            </div>
            <button
              onClick={toggleShuffle}
              className={`w-12 h-6 rounded-full p-1 transition-all ${
                shuffle ? "bg-[#4cf479]" : "bg-white/10"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-black transition-transform ${
                  shuffle ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="border-t border-white/5 pt-6 flex justify-between items-center">
            <div>
              <span className="font-semibold text-sm text-white/80 block">Repeat Behavior</span>
              <span className="text-[10px] text-white/40">Current looping modes: {repeat}</span>
            </div>
            <button
              onClick={cycleRepeat}
              className="bg-white/10 border border-white/20 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all uppercase"
            >
              Cycle mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
