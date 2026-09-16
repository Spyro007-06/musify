'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  FileText,
  Sparkles,
  Heart,
  BookOpen,
  HelpCircle,
  Music2,
  Loader2,
  Lock,
} from 'lucide-react';
import { useAnalyzeLyrics } from '@/hooks/use-ai';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';
import { LyricsAnalysis } from '@/types/ai';
import { cn } from '@/lib/utils/cn';

export function LyricsAnalyzer({ className }: { className?: string }) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const [trackId, setTrackId] = React.useState('');
  const [lyrics, setLyrics] = React.useState('');
  const [analysis, setAnalysis] = React.useState<LyricsAnalysis | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const analyzeMutation = useAnalyzeLyrics();

  const handleUseCurrentTrack = () => {
    if (currentTrack?.id) {
      setTrackId(currentTrack.id);
      setValidationError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!trackId.trim()) {
      setValidationError('Please enter a Track ID or use the currently playing track.');
      return;
    }

    if (!lyrics.trim()) {
      setValidationError('Please paste or type the song lyrics to analyze.');
      return;
    }

    analyzeMutation.mutate(
      {
        trackId: trackId.trim(),
        lyrics: lyrics.trim(),
      },
      {
        onSuccess: (data) => {
          setAnalysis(data);
        },
      }
    );
  };

  const handleReset = () => {
    setLyrics('');
    setAnalysis(null);
    setValidationError(null);
  };

  if (!isAuthenticated && !isInitializing) {
    return (
      <div className={cn('rounded-3xl border border-purple-800/30 bg-neutral-900/40 p-8 sm:p-12 text-center', className)}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 mx-auto mb-4 border border-purple-500/20">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Sign In for Lyrics Analysis
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-6">
          AI lyrics breakdown and sentiment interpretation require an active account. Please log in to explore song meanings.
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
          <FileText className="h-4 w-4" />
          Lyrics & Vibes
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Unpack the message, mood, and trivia
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-xl">
          Provide song lyrics and track identification to examine emotional undertones, lyrical themes, and musical trivia.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Track ID Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="ai-track-id" className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Track ID <span className="text-purple-400">*</span>
            </label>
            {currentTrack && (
              <button
                type="button"
                onClick={handleUseCurrentTrack}
                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
              >
                <Music2 className="h-3.5 w-3.5" />
                <span>Use Current: {currentTrack.title}</span>
              </button>
            )}
          </div>
          <input
            id="ai-track-id"
            type="text"
            value={trackId}
            onChange={(e) => {
              setTrackId(e.target.value);
              setValidationError(null);
            }}
            placeholder="e.g. JioSaavn or Spotify track ID"
            className="w-full rounded-xl bg-neutral-800/80 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 border border-white/10 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            required
          />
        </div>

        {/* Lyrics Field */}
        <div>
          <label htmlFor="ai-lyrics-input" className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1.5">
            Song Lyrics <span className="text-purple-400">*</span>
          </label>
          <textarea
            id="ai-lyrics-input"
            rows={6}
            value={lyrics}
            onChange={(e) => {
              setLyrics(e.target.value);
              setValidationError(null);
            }}
            placeholder="Paste verse, chorus, or full song lyrics here..."
            className="w-full rounded-2xl bg-neutral-800/90 p-4 text-sm text-white placeholder:text-neutral-500 border border-white/10 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none leading-relaxed"
            required
          />
        </div>

        {/* Validation or API error notice */}
        {(validationError || analyzeMutation.isError) && (
          <div role="alert" className="rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-400">
            {validationError || analyzeMutation.error?.message || 'Failed to analyze lyrics. Please try again.'}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!lyrics.trim() || !trackId.trim() || analyzeMutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all shadow-lg select-none',
              lyrics.trim() && trackId.trim() && !analyzeMutation.isPending
                ? 'bg-purple-600 hover:bg-purple-500 hover:scale-105 active:scale-95 shadow-purple-950/60'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            )}
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing Lyrical Depth...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Analyze Lyrics</span>
              </>
            )}
          </button>

          {(lyrics || analysis) && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Analysis Results Display */}
      {analysis && (
        <div className="pt-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
            <Sparkles className="h-4 w-4" />
            AI Breakdown Results
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mood Card */}
            <div className="rounded-2xl bg-neutral-900/90 p-5 border border-purple-500/30 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                <Heart className="h-4 w-4" />
                Mood & Vibe
              </div>
              <h4 className="text-base font-bold text-white">
                {analysis.mood}
              </h4>
              <p className="text-xs text-neutral-400">
                Emotional frequency detected across verses and chorus.
              </p>
            </div>

            {/* Meaning Card */}
            <div className="rounded-2xl bg-neutral-900/90 p-5 border border-indigo-500/30 space-y-2 md:col-span-2">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <BookOpen className="h-4 w-4" />
                Lyrical Meaning
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed">
                {analysis.meaning}
              </p>
            </div>
          </div>

          {/* Trivia Card */}
          <div className="rounded-2xl bg-neutral-900/90 p-5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="h-4 w-4" />
              Song Trivia & Lore
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {analysis.trivia}
            </p>
          </div>

          <p className="text-[11px] text-neutral-500 text-center pt-2">
            Analysis rendered by the MUSIFY AI Lyrics &amp; Vibes engine.
          </p>
        </div>
      )}
    </div>
  );
}
