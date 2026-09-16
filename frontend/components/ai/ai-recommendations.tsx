'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Music2,
  RefreshCw,
  Lock,
  Search,
  Play,
  Pause,
} from 'lucide-react';
import { useAIRecommendations } from '@/hooks/use-ai';
import { useTrack } from '@/hooks/use-music';
import { musicApi } from '@/lib/api/music';
import { usePlayerStore } from '@/stores/player-store';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import { AIRecommendationItem } from '@/types/ai';
import { formatDuration } from '@/lib/utils/format-duration';
import { cn } from '@/lib/utils/cn';

const SUGGESTED_MOODS = [
  'Chill',
  'Energetic',
  'Late Night',
  'Focus',
  'Workout',
  'Romantic',
  'Acoustic',
];

export function AiRecommendations({ className }: { className?: string }) {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const [selectedMood, setSelectedMood] = React.useState<string>('');
  const [customMoodInput, setCustomMoodInput] = React.useState<string>('');
  const queryClient = useQueryClient();

  const {
    data: recommendations = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useAIRecommendations(selectedMood || undefined);

  // Warm the track cache for every recommended track in one pass instead of
  // leaving each card to trigger its own fetch on mount (no batch track
  // endpoint exists on the backend, so this is still N requests, but they're
  // all kicked off together here rather than scattered across N components).
  React.useEffect(() => {
    recommendations.forEach((item) => {
      queryClient.prefetchQuery({
        queryKey: ['music', 'track', item.spotifyTrackId],
        queryFn: async () => {
          try {
            const res = await musicApi.getTrack(item.spotifyTrackId);
            return res.data || null;
          } catch (err: unknown) {
            const status = (err as { status?: number })?.status;
            if (status === 404) return null;
            throw err;
          }
        },
        staleTime: 1000 * 60 * 10,
      });
    });
  }, [recommendations, queryClient]);

  const handleMoodSelect = (mood: string) => {
    if (selectedMood === mood.toLowerCase()) {
      setSelectedMood('');
    } else {
      setSelectedMood(mood.toLowerCase());
    }
  };

  const handleCustomMoodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customMoodInput.trim()) {
      setSelectedMood(customMoodInput.trim().toLowerCase());
    }
  };

  return (
    <div
      id="ai-recommendations"
      className={cn('space-y-6 rounded-3xl bg-neutral-900/40 p-6 sm:p-8 border border-white/5', className)}
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-400 mb-1">
            <Sparkles className="h-4 w-4" />
            AI Curation
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Mood & Vibe Recommendations
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400">
            Select or enter a mood to explore AI-suggested tracks matching your state of mind.
          </p>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 border border-white/10 transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh
          </button>
        )}
      </div>

      {/* Mood Selectors */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMood('')}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border select-none',
              selectedMood === ''
                ? 'bg-accent-600 text-white border-accent-500 shadow-md shadow-accent-950/50'
                : 'bg-neutral-800/80 text-neutral-300 border-white/5 hover:bg-neutral-700 hover:text-white'
            )}
          >
            All Vibes
          </button>
          {SUGGESTED_MOODS.map((mood) => {
            const isSelected = selectedMood === mood.toLowerCase();
            return (
              <button
                key={mood}
                type="button"
                onClick={() => handleMoodSelect(mood)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border select-none',
                  isSelected
                    ? 'bg-accent-600 text-white border-accent-500 shadow-md shadow-accent-950/50'
                    : 'bg-neutral-800/80 text-neutral-300 border-white/5 hover:bg-neutral-700 hover:text-white'
                )}
              >
                {mood}
              </button>
            );
          })}
        </div>

        {/* Custom Mood Input */}
        <form onSubmit={handleCustomMoodSubmit} className="flex max-w-md items-center gap-2 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={customMoodInput}
              onChange={(e) => setCustomMoodInput(e.target.value)}
              placeholder="Or type a custom mood (e.g. nostalgic, dreamy)..."
              className="w-full rounded-full bg-neutral-800/90 px-4 py-2 pl-9 text-xs text-white placeholder:text-neutral-500 border border-white/5 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          </div>
          <button
            type="submit"
            disabled={!customMoodInput.trim()}
            className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-40 transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Content States */}
      {!isAuthenticated && !isInitializing ? (
        <div className="rounded-2xl border border-dashed border-accent-800/30 bg-accent-950/10 p-8 text-center">
          <Lock className="h-8 w-8 text-accent-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">
            Authentication Required
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
            AI recommendations require an active session. Log in to explore personalized and mood-tailored song suggestions.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-accent-600 px-5 py-2 text-xs font-bold text-white hover:bg-accent-500 transition-colors shadow-lg shadow-accent-950/50"
          >
            Log In to Access AI
          </Link>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-neutral-800/40 p-5 border border-white/5 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded-full bg-neutral-700" />
                <Skeleton className="h-4 w-16 rounded-full bg-neutral-700" />
              </div>
              <Skeleton className="h-5 w-3/4 rounded bg-neutral-700" />
              <Skeleton className="h-3 w-1/2 rounded bg-neutral-700" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-950/10 p-6 text-center">
          <p className="text-sm text-red-400 mb-3">
            {error?.message || 'Unable to retrieve AI recommendations right now.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-800 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-900/30 p-8 text-center">
          <Music2 className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">
            No recommendations found for this mood. Try choosing another vibe above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((item, idx) => (
            <AIRecommendationCard
              key={item.spotifyTrackId || idx}
              item={item}
            />
          ))}
        </div>
      )}

      {/* Honest AI copy note */}
      <p className="text-[11px] text-neutral-500 text-center">
        Track recommendations are dynamically served by the MUSIFY AI recommendations service.
      </p>
    </div>
  );
}

function AIRecommendationCard({ item }: { item: AIRecommendationItem }) {
  const { data: track, isLoading: isTrackLoading } = useTrack(item.spotifyTrackId);
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();

  const matchPercentage = Math.round(item.score * 100);
  const isCurrent = track ? currentTrack?.id === track.id : false;
  const isPlayingThis = isCurrent && isPlaying;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track) return;
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, [track]);
    }
  };

  const artistName =
    track?.artists?.map((a) => a.name).join(', ') ||
    'Unknown Artist';

  const artworkUrl = track?.artwork || track?.album?.artwork;

  return (
    <div
      onClick={track ? handlePlay : undefined}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl bg-neutral-900/80 p-5 border transition-all duration-300',
        track ? 'cursor-pointer hover:border-accent-500/40 hover:bg-neutral-850 hover:shadow-xl hover:shadow-accent-950/20' : 'border-white/10'
      )}
    >
      <div>
        {/* Match & Reason header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
            {matchPercentage}% Match
          </span>
          <span className="text-[11px] text-neutral-400 truncate max-w-[150px]">
            {item.reason}
          </span>
        </div>

        {/* Track Info */}
        {isTrackLoading ? (
          <div className="flex items-center gap-3 animate-pulse">
            <Skeleton className="h-12 w-12 rounded-xl bg-neutral-800 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4 rounded bg-neutral-800" />
              <Skeleton className="h-3 w-1/2 rounded bg-neutral-800" />
            </div>
          </div>
        ) : track ? (
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-800 overflow-hidden border border-white/10 group-hover:border-accent-500/40 transition-colors">
              {artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artworkUrl}
                  alt={track.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Music2 className="h-5 w-5 text-neutral-500" />
              )}
              {/* Play overlay */}
              <button
                type="button"
                onClick={handlePlay}
                aria-label={isPlayingThis ? 'Pause track' : 'Play track'}
                className={cn(
                  'absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-opacity',
                  isPlayingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              >
                {isPlayingThis ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                )}
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <h4
                className={cn(
                  'text-sm font-semibold truncate transition-colors',
                  isCurrent ? 'text-accent-400' : 'text-white group-hover:text-accent-300'
                )}
              >
                {track.title}
              </h4>
              <p className="text-xs text-neutral-400 truncate">
                {artistName}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-950/50 border border-accent-500/20 text-accent-400">
              <Music2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-white truncate group-hover:text-accent-300 transition-colors">
                Track {item.spotifyTrackId}
              </h4>
              <p className="text-xs text-neutral-400 truncate">
                Curated Recommendation
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500">
        <span>{track?.duration ? formatDuration(track.duration) : 'AI Curation'}</span>
        <span className="text-accent-400/80 font-medium">Confidence: {item.score.toFixed(2)}</span>
      </div>
    </div>
  );
}

