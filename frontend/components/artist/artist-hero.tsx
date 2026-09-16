'use client';

import * as React from 'react';
import {
  Play,
  Pause,
  Check,
  Plus,
  Share2,
  Info,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Artist } from '@/types/artist';
import { Track } from '@/types/track';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { usePlayerStore } from '@/stores/player-store';
import { useToggleFollowArtist } from '@/hooks/use-artist';
import { ArtistAboutModal } from './artist-about-modal';
import { cn } from '@/lib/utils/cn';

interface ArtistHeroProps {
  artist: Artist;
  topTracks?: Track[];
}

export function ArtistHero({ artist, topTracks = [] }: ArtistHeroProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const [isAboutOpen, setIsAboutOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const followMutation = useToggleFollowArtist(artist.id);
  const isFollowing = Boolean(artist.isFollowing);
  const followers = artist.followers ?? 0;
  const imageUrl = artist.image;

  // Check if currently playing this artist
  const isCurrentArtistPlaying =
    isPlaying &&
    currentTrack !== null &&
    (topTracks.some((t) => t.id === currentTrack.id) ||
      currentTrack.artists?.some((a) => a.id === artist.id || a.name === artist.name));

  const isCurrentArtistPaused =
    !isPlaying &&
    currentTrack !== null &&
    (topTracks.some((t) => t.id === currentTrack.id) ||
      currentTrack.artists?.some((a) => a.id === artist.id || a.name === artist.name));

  const handlePlayToggle = () => {
    if (isCurrentArtistPlaying) {
      togglePlay();
    } else if (isCurrentArtistPaused) {
      togglePlay();
    } else if (topTracks.length > 0) {
      playTrack(topTracks[0], topTracks);
    }
  };

  const handleFollowClick = () => {
    if (followMutation.isPending) return;
    followMutation.mutate({ isFollowing });
  };

  const handleShareClick = async () => {
    try {
      if (typeof window !== 'undefined') {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const formatFollowers = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="relative -mx-4 -mt-6 sm:-mx-8 sm:-mt-8 mb-8 overflow-hidden rounded-b-3xl bg-neutral-950 border-b border-white/10">
      {/* Background Ambience / Backdrop Banner */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {imageUrl ? (
          <div className="absolute inset-0 scale-110 filter blur-3xl opacity-25 transition-opacity duration-1000">
            <ImageWithFallback
              src={imageUrl}
              alt=""
              fill
              className="object-cover object-center"
              priority
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-neutral-900/60 to-neutral-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-neutral-950/70 to-neutral-950" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 px-4 py-8 sm:px-8 sm:py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 max-w-7xl mx-auto">
          {/* Artist Avatar Image */}
          <div className="relative group shrink-0">
            <div className="relative h-40 w-40 sm:h-48 sm:w-48 md:h-56 md:w-56 overflow-hidden rounded-full ring-4 ring-white/10 shadow-2xl bg-neutral-850">
              <ImageWithFallback
                src={imageUrl}
                alt={artist.name}
                fill
                sizes="(max-width: 640px) 160px, (max-width: 768px) 192px, 224px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
            </div>
            {artist.isVerified && (
              <div
                title="Verified Artist"
                className="absolute bottom-1 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg ring-4 ring-neutral-950"
              >
                <Check className="h-5 w-5 stroke-[3]" />
              </div>
            )}
          </div>

          {/* Artist Meta Information */}
          <div className="flex-1 text-center md:text-left min-w-0">
            {/* Verified Pill / Subtitle */}
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              {artist.isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified Artist
                </span>
              ) : (
                <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  Artist Profile
                </span>
              )}
            </div>

            {/* Artist Name */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-none mb-3 drop-shadow-md break-words">
              {artist.name}
            </h1>

            {/* Listener Count & Genres */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-sm text-neutral-400 mb-6">
              <span className="font-medium text-neutral-200">
                {formatFollowers(followers)} {followers === 1 ? 'follower' : 'followers'}
              </span>
              {artist.genres && artist.genres.length > 0 && (
                <>
                  <span className="text-neutral-600">•</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {artist.genres.slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-neutral-300 border border-white/5 capitalize"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4">
              {/* Play All Button */}
              {topTracks.length > 0 && (
                <button
                  type="button"
                  onClick={handlePlayToggle}
                  aria-label={isCurrentArtistPlaying ? 'Pause' : 'Play all top tracks'}
                  className={cn(
                    'flex h-12 sm:h-14 items-center gap-2.5 px-6 sm:px-8 rounded-full font-bold text-sm sm:text-base transition-all duration-200 shadow-lg select-none',
                    'bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-emerald-950/50'
                  )}
                >
                  {isCurrentArtistPlaying ? (
                    <>
                      <Pause className="h-5 w-5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                      <span>Play</span>
                    </>
                  )}
                </button>
              )}

              {/* Follow / Unfollow Button */}
              <button
                type="button"
                onClick={handleFollowClick}
                disabled={followMutation.isPending}
                aria-label={isFollowing ? `Unfollow ${artist.name}` : `Follow ${artist.name}`}
                className={cn(
                  'flex h-12 sm:h-14 items-center gap-2 px-5 sm:px-6 rounded-full font-semibold text-sm transition-all duration-200 border select-none',
                  isFollowing
                    ? 'bg-transparent text-white border-white/30 hover:border-white hover:bg-white/5'
                    : 'bg-white text-black border-white hover:bg-neutral-200 hover:scale-105 active:scale-95',
                  followMutation.isPending && 'opacity-60 cursor-not-allowed'
                )}
              >
                {followMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Follow</span>
                  </>
                )}
              </button>

              {/* About Button */}
              <button
                type="button"
                onClick={() => setIsAboutOpen(true)}
                aria-label="Artist Information and Biography"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900/80 border border-white/10 text-neutral-300 hover:text-white hover:border-white/30 hover:bg-neutral-800 transition-colors"
                title="About Artist"
              >
                <Info className="h-5 w-5" />
              </button>

              {/* Share Button */}
              <button
                type="button"
                onClick={handleShareClick}
                aria-label="Share artist link"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900/80 border border-white/10 text-neutral-300 hover:text-white hover:border-white/30 hover:bg-neutral-800 transition-colors relative"
                title="Share Artist"
              >
                <Share2 className="h-5 w-5" />
                {copied && (
                  <span className="absolute -top-8 px-2 py-0.5 rounded bg-emerald-500 text-[10px] font-bold text-black shadow animate-in fade-in zoom-in duration-150">
                    Copied!
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* About Modal */}
      <ArtistAboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        artist={artist}
      />
    </div>
  );
}
