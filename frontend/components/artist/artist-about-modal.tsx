'use client';

import * as React from 'react';
import { X, CheckCircle2, Users, Music } from 'lucide-react';
import { Artist } from '@/types/artist';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface ArtistAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  artist: Artist;
}

export function ArtistAboutModal({
  isOpen,
  onClose,
  artist,
}: ArtistAboutModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const imageUrl = artist.image;
  const followers = artist.followers ?? 0;
  const formattedFollowers = new Intl.NumberFormat('en-US').format(followers);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner image or gradient */}
        <div className="relative h-48 w-full bg-gradient-to-b from-neutral-800 to-neutral-900 overflow-hidden">
          {imageUrl && (
            <ImageWithFallback
              src={imageUrl}
              alt={artist.name}
              fill
              className="object-cover opacity-30 blur-sm scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-neutral-400 hover:text-white hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Artist identity */}
          <div className="absolute bottom-4 left-6 right-6 flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-emerald-500/30 shadow-lg shrink-0">
              <ImageWithFallback
                src={imageUrl}
                alt={artist.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 id="about-modal-title" className="text-xl font-bold text-white truncate">
                  {artist.name}
                </h2>
                {artist.isVerified && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-neutral-400">
                {artist.isVerified ? 'Verified Musify Artist' : 'Artist Profile'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-neutral-800/60 p-3 border border-white/5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{formattedFollowers}</p>
                <p className="text-xs text-neutral-400">Followers</p>
              </div>
            </div>

            <div className="rounded-xl bg-neutral-800/60 p-3 border border-white/5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Music className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white truncate">
                  {artist.genres && artist.genres.length > 0 ? artist.genres[0] : 'Music'}
                </p>
                <p className="text-xs text-neutral-400">Primary Genre</p>
              </div>
            </div>
          </div>

          {/* Biography */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Biography
            </h3>
            <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line space-y-2">
              {artist.bio || `Official artist profile of ${artist.name} on Musify. Listen to top tracks, latest releases, and albums.`}
            </div>
          </div>

          {/* Genres */}
          {artist.genres && artist.genres.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Genres & Styles
              </h3>
              <div className="flex flex-wrap gap-2">
                {artist.genres.map((genre) => (
                  <span
                    key={genre}
                    className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-neutral-300 border border-white/10"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
