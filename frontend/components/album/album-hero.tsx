'use client';

import * as React from 'react';
import Link from 'next/link';
import { Play, Pause, Shuffle, Share2, Disc3, Clock, Music2 } from 'lucide-react';
import { Album } from '@/types/album';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils/cn';

interface AlbumHeroProps {
  album: Album;
}

export function AlbumHero({ album }: AlbumHeroProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  const [copied, setCopied] = React.useState(false);

  const artwork = album.artwork;
  const tracks = React.useMemo(() => album.tracks || [], [album.tracks]);
  const hasTracks = tracks.length > 0;

  // Calculate total duration
  const totalSeconds = React.useMemo(() => {
    return tracks.reduce((acc, t) => {
      const dur = t.duration ?? (t.durationMs ? t.durationMs / 1000 : t.durationSeconds ?? 0);
      return acc + (isNaN(dur) ? 0 : Math.round(dur));
    }, 0);
  }, [tracks]);

  const formattedTotalDuration = React.useMemo(() => {
    if (totalSeconds <= 0) return '';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min ${seconds} sec`;
  }, [totalSeconds]);

  // Check if current track belongs to this album
  const isCurrentAlbumPlaying =
    isPlaying &&
    currentTrack !== null &&
    tracks.some((t) => t.id === currentTrack.id);

  const isCurrentAlbumPaused =
    !isPlaying &&
    currentTrack !== null &&
    tracks.some((t) => t.id === currentTrack.id);

  const handlePlayToggle = () => {
    if (!hasTracks) return;

    if (isCurrentAlbumPlaying) {
      togglePlay();
    } else if (isCurrentAlbumPaused) {
      togglePlay();
    } else {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShufflePlay = () => {
    if (!hasTracks) return;
    const randomIndex = Math.floor(Math.random() * tracks.length);
    playTrack(tracks[randomIndex], tracks);
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

  // Artist rendering helper
  const renderArtistLink = () => {
    const artistName = album.artist?.name || 'Various Artists';
    const artistId = album.artist?.id;
    const hasValidArtistId = artistId && artistId !== 'various-artists';

    if (hasValidArtistId) {
      return (
        <Link
          href={`/artists/${artistId}`}
          className="font-semibold text-white hover:text-brand-400 hover:underline transition-colors"
        >
          {artistName}
        </Link>
      );
    }

    return <span className="font-semibold text-white">{artistName}</span>;
  };

  const albumType = (album.type || 'ALBUM').toUpperCase();

  return (
    <div className="relative -mx-4 -mt-6 sm:-mx-8 sm:-mt-8 mb-8 overflow-hidden rounded-b-3xl bg-neutral-950 border-b border-white/10">
      {/* Ambient backdrop blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {artwork ? (
          <div className="absolute inset-0 scale-110 filter blur-3xl opacity-25 transition-opacity duration-1000">
            <ImageWithFallback
              src={artwork}
              alt=""
              fill
              className="object-cover object-center"
              priority
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-800/40 via-neutral-900/60 to-neutral-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-neutral-950/70 to-neutral-950" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 px-4 py-8 sm:px-8 sm:py-12 md:py-16">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-8 max-w-7xl mx-auto">
          {/* Album Artwork with subtle vinyl peek effect */}
          <div className="relative group shrink-0">
            <div className="relative aspect-square w-44 sm:w-52 md:w-60 lg:w-64 overflow-hidden rounded-2xl ring-2 ring-white/10 shadow-2xl bg-neutral-900">
              <ImageWithFallback
                src={artwork}
                alt={album.title}
                fallbackIcon={<Disc3 className="h-1/3 w-1/3 stroke-[1.5] text-neutral-600 animate-spin-slow" />}
                fill
                sizes="(max-width: 640px) 176px, (max-width: 768px) 208px, 256px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                priority
              />
            </div>
          </div>

          {/* Album Metadata */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            {/* Type badge */}
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold tracking-wider bg-white/10 text-neutral-300 border border-white/10">
                {albumType}
              </span>
              {album.genre && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-neutral-400 bg-white/5 border border-white/5 capitalize">
                  {album.genre}
                </span>
              )}
            </div>

            {/* Album Title */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-3 drop-shadow-md break-words">
              {album.title}
            </h1>

            {/* Meta details: Artist • Year • Tracks • Duration */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-2.5 text-sm text-neutral-300 mb-6">
              {renderArtistLink()}

              {album.releaseYear && (
                <>
                  <span className="text-neutral-500">•</span>
                  <span>{album.releaseYear}</span>
                </>
              )}

              <span className="text-neutral-500">•</span>
              <span className="flex items-center gap-1">
                <Music2 className="h-3.5 w-3.5 text-neutral-400" />
                <span>
                  {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
                </span>
              </span>

              {formattedTotalDuration && (
                <>
                  <span className="text-neutral-500">•</span>
                  <span className="flex items-center gap-1 text-neutral-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formattedTotalDuration}</span>
                  </span>
                </>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
              {/* Play All Button */}
              <button
                type="button"
                onClick={handlePlayToggle}
                disabled={!hasTracks}
                aria-label={isCurrentAlbumPlaying ? 'Pause album' : 'Play all tracks'}
                className={cn(
                  'flex h-12 sm:h-14 items-center gap-2.5 px-6 sm:px-8 rounded-full font-bold text-sm sm:text-base transition-all duration-200 shadow-lg select-none',
                  hasTracks
                    ? 'bg-brand-500 text-black hover:bg-brand-400 hover:scale-105 active:scale-95 shadow-brand-950/50'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                )}
              >
                {isCurrentAlbumPlaying ? (
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

              {/* Shuffle Play Button */}
              {hasTracks && (
                <button
                  type="button"
                  onClick={handleShufflePlay}
                  aria-label="Shuffle play album"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900/80 border border-white/10 text-neutral-300 hover:text-white hover:border-white/30 hover:bg-neutral-800 transition-colors"
                  title="Shuffle Play"
                >
                  <Shuffle className="h-5 w-5" />
                </button>
              )}

              {/* Share Button */}
              <button
                type="button"
                onClick={handleShareClick}
                aria-label="Share album link"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900/80 border border-white/10 text-neutral-300 hover:text-white hover:border-white/30 hover:bg-neutral-800 transition-colors relative"
                title="Share Album"
              >
                <Share2 className="h-5 w-5" />
                {copied && (
                  <span className="absolute -top-8 px-2 py-0.5 rounded bg-brand-500 text-[10px] font-bold text-black shadow animate-in fade-in zoom-in duration-150">
                    Copied!
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
