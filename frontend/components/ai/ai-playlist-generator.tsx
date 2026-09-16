'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Wand2,
  Sparkles,
  ListMusic,
  ArrowRight,
  RefreshCw,
  Loader2,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { useGenerateAIPlaylist } from '@/hooks/use-ai';
import { useAuthStore } from '@/stores/auth-store';
import { GenerateAIPlaylistResult } from '@/types/ai';
import { cn } from '@/lib/utils/cn';

const EXAMPLE_PROMPTS = [
  'Chill Hindi songs for late-night drives',
  'Energetic workout music for gym sessions',
  'Romantic acoustic songs from the 2000s',
  'Lofi beats for coding and deep focus',
  'Songs like Anirudh Ravichander',
];

export function AiPlaylistGenerator({ className }: { className?: string }) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const [prompt, setPrompt] = React.useState('');
  const [playlistName, setPlaylistName] = React.useState('');
  const [result, setResult] = React.useState<GenerateAIPlaylistResult | null>(null);

  const generateMutation = useGenerateAIPlaylist();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || generateMutation.isPending) return;

    generateMutation.mutate(
      {
        prompt: prompt.trim(),
        playlistName: playlistName.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setResult(data);
        },
      }
    );
  };

  const handleApplyExample = (example: string) => {
    setPrompt(example);
    setResult(null);
  };

  const handleReset = () => {
    setPrompt('');
    setPlaylistName('');
    setResult(null);
  };

  if (!isAuthenticated && !isInitializing) {
    return (
      <div className={cn('rounded-3xl border border-purple-800/30 bg-neutral-900/40 p-8 sm:p-12 text-center', className)}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 mx-auto mb-4 border border-purple-500/20">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Sign In to Generate Playlists
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-6">
          AI playlist generation creates and saves real playlists to your MUSIFY library. Please log in or create an account to start creating.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-950/50"
        >
          Log In to Musify
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6 rounded-3xl border border-white/10 bg-neutral-900/60 p-6 sm:p-10 backdrop-blur-sm', className)}>
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
          <Wand2 className="h-4 w-4" />
          Prompt-to-Playlist
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Describe the vibe, we build the tracklist
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
          Enter natural prompts mentioning genres, moods, eras, or artists. The generator curates songs and persists a real playlist directly in your library.
        </p>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-neutral-400">Try an example prompt:</span>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleApplyExample(example)}
              className="rounded-full bg-neutral-800/80 px-3.5 py-1.5 text-xs text-neutral-300 border border-white/5 hover:border-purple-500/30 hover:bg-neutral-750 hover:text-white transition-all text-left"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Generator Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Prompt Input */}
        <div>
          <label htmlFor="ai-prompt-input" className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
            Your Prompt <span className="text-purple-400">*</span>
          </label>
          <textarea
            id="ai-prompt-input"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. 90s upbeat pop dance tracks for a road trip with friends..."
            className="w-full rounded-2xl bg-neutral-800/90 p-4 text-sm text-white placeholder:text-neutral-500 border border-white/10 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none"
            required
          />
        </div>

        {/* Optional Custom Playlist Name */}
        <div>
          <label htmlFor="ai-playlist-name" className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
            Playlist Name <span className="text-neutral-500 font-normal">(optional)</span>
          </label>
          <input
            id="ai-playlist-name"
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Leave blank to auto-generate a title"
            className="w-full rounded-xl bg-neutral-800/80 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 border border-white/10 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
          />
        </div>

        {/* Error notice */}
        {generateMutation.isError && (
          <div role="alert" className="rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-400">
            {generateMutation.error?.message || 'Failed to generate playlist. Please verify your prompt and try again.'}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!prompt.trim() || generateMutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all shadow-lg select-none',
              prompt.trim() && !generateMutation.isPending
                ? 'bg-purple-600 hover:bg-purple-500 hover:scale-105 active:scale-95 shadow-purple-950/60'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            )}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Curating & Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate Playlist</span>
              </>
            )}
          </button>

          {prompt && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Outcome Cards */}
      {result && (
        <div className="pt-4 animate-in fade-in zoom-in-95 duration-200">
          {result.playlistId !== null ? (
            /* SUCCESS CASE: 201 Created with persisted playlist */
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-neutral-900 to-neutral-900 p-6 sm:p-8 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    <ListMusic className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20 mb-1">
                      Playlist Created & Saved
                    </span>
                    <h3 className="text-xl font-bold text-white">
                      {result.title}
                    </h3>
                  </div>
                </div>

                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-300 border border-white/10 shrink-0">
                  {result.trackCount} tracks
                </span>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300">
                Your playlist has been assembled and saved to your personal library. You can play, customize, or share it anytime.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={`/playlists/${result.playlistId}`}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-xs sm:text-sm font-bold text-black hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-950/60"
                >
                  <span>Open Playlist</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Generate Another
                </button>
              </div>
            </div>
          ) : (
            /* UNRECOGNIZED INTENT CASE: 200 OK with null playlistId (non-error!) */
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-6 space-y-4">
              <div className="flex items-center gap-3 text-amber-400">
                <HelpCircle className="h-6 w-6 shrink-0" />
                <h3 className="text-base font-bold text-white">
                  No recognizable signal detected
                </h3>
              </div>

              <p className="text-sm text-amber-200/90 leading-relaxed">
                {result.message || "Couldn't find anything matching that prompt — try mentioning a genre, artist, or mood."}
              </p>

              <div className="rounded-xl bg-black/40 p-4 border border-white/5 text-xs text-neutral-400 space-y-1.5">
                <p className="font-semibold text-neutral-300">Tips for better results:</p>
                <ul className="list-disc list-inside space-y-1 text-neutral-400">
                  <li>Specify a genre: <code className="text-purple-300">Hindi, Punjabi, Pop, Rock, Hip-Hop, Acoustic</code></li>
                  <li>Specify a mood: <code className="text-purple-300">Chill, Energetic, Workout, Party, Late Night</code></li>
                  <li>Specify an era: <code className="text-purple-300">90s, 2000s, 80s</code></li>
                  <li>Mention an artist: <code className="text-purple-300">&quot;songs like Arijit Singh&quot;</code> or <code className="text-purple-300">&quot;similar to Taylor Swift&quot;</code></li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
              >
                Refine Prompt
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
