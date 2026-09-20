'use client';

import * as React from 'react';
import {
  Sliders,
  Music,
  Languages,
  Smile,
  Mic2,
  Disc3,
  Save,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { UserPreferences } from '@/lib/api/user';
import { useUserPreferences, useUpdatePreferences } from '@/hooks/use-user';
import { ChipGroup } from './chip-group';
import { TagInput } from './tag-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { ErrorState } from '@/components/ui/error-state';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';

const GENRE_OPTIONS = [
  'Pop',
  'Rock',
  'Hip-Hop',
  'Rap',
  'Indie',
  'Bollywood',
  'EDM',
  'Electronic',
  'Acoustic',
  'Classical',
  'Jazz',
  'R&B',
  'Metal',
  'Lo-Fi',
  'Synthwave',
  'K-Pop',
  'Folk',
  'Dance',
  'Soul',
];

const LANGUAGE_OPTIONS = [
  'Hindi',
  'English',
  'Punjabi',
  'Tamil',
  'Telugu',
  'Spanish',
  'Korean',
  'Bengali',
  'Malayalam',
  'Kannada',
  'Marathi',
  'Gujarati',
];

const MOOD_OPTIONS = [
  'Chill',
  'Energetic',
  'Focus',
  'Workout',
  'Late Night',
  'Romantic',
  'Party',
  'Acoustic',
  'Driving',
  'Melancholy',
  'Mellow',
  'Upbeat',
];

interface PreferencesFormProps {
  className?: string;
}

export function PreferencesForm({ className }: PreferencesFormProps) {
  const { data: initialPreferences, isLoading, isError, refetch } = useUserPreferences();
  const updatePreferencesMutation = useUpdatePreferences();

  const [genres, setGenres] = React.useState<string[]>([]);
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [moods, setMoods] = React.useState<string[]>([]);
  const [artists, setArtists] = React.useState<string[]>([]);
  const [albums, setAlbums] = React.useState<string[]>([]);

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Synchronize state when initial data loads
  React.useEffect(() => {
    if (initialPreferences) {
      setGenres(initialPreferences.favouriteGenres || []);
      setLanguages(initialPreferences.favouriteLanguages || []);
      setMoods(initialPreferences.favouriteMoods || []);
      setArtists(initialPreferences.favouriteArtists || []);
      setAlbums(initialPreferences.favouriteAlbums || []);
    }
  }, [initialPreferences]);

  // Check if dirty
  const isDirty = React.useMemo(() => {
    if (!initialPreferences) return false;
    const sameArray = (a: string[] = [], b: string[] = []) =>
      a.length === b.length && a.every((val, i) => val.toLowerCase() === b[i]?.toLowerCase());

    return (
      !sameArray(genres, initialPreferences.favouriteGenres) ||
      !sameArray(languages, initialPreferences.favouriteLanguages) ||
      !sameArray(moods, initialPreferences.favouriteMoods) ||
      !sameArray(artists, initialPreferences.favouriteArtists) ||
      !sameArray(albums, initialPreferences.favouriteAlbums)
    );
  }, [genres, languages, moods, artists, albums, initialPreferences]);

  const handleReset = () => {
    if (initialPreferences) {
      setGenres(initialPreferences.favouriteGenres || []);
      setLanguages(initialPreferences.favouriteLanguages || []);
      setMoods(initialPreferences.favouriteMoods || []);
      setArtists(initialPreferences.favouriteArtists || []);
      setAlbums(initialPreferences.favouriteAlbums || []);
    }
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: UserPreferences = {
      favouriteGenres: genres,
      favouriteLanguages: languages,
      favouriteMoods: moods,
      favouriteArtists: artists,
      favouriteAlbums: albums,
    };

    try {
      await updatePreferencesMutation.mutateAsync(payload);
      toast.success('Music preferences updated! Recommendations have been refreshed.');
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        errObj?.response?.data?.message ||
        errObj?.message ||
        'Failed to save preferences. Please try again.';
      setErrorMessage(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 space-y-6 animate-pulse">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded bg-neutral-800" />
          <Skeleton className="h-4 w-72 rounded bg-neutral-800" />
        </div>
        <div className="space-y-4 pt-4">
          <Skeleton className="h-20 w-full rounded-xl bg-neutral-800" />
          <Skeleton className="h-20 w-full rounded-xl bg-neutral-800" />
          <Skeleton className="h-20 w-full rounded-xl bg-neutral-800" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load preferences"
        message="There was an error fetching your music preference settings."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'rounded-2xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 space-y-8',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-400 mb-1">
            <Sliders className="h-3.5 w-3.5" />
            Tuning & Taste Profile
          </div>
          <h2 className="text-xl font-bold text-white">Music Preferences</h2>
          <p className="text-xs text-neutral-400">
            Customize your genres, languages, moods, artists, and albums to shape personalized recommendations.
          </p>
        </div>

        {isDirty && (
          <span className="self-start sm:self-auto rounded-full bg-accent-500/10 px-3 py-1 text-[11px] font-semibold text-accent-400 border border-accent-500/20">
            Unsaved Changes
          </span>
        )}
      </div>

      {/* Error Notification */}
      {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

      {/* Favourite Genres */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Music className="h-4 w-4 text-accent-400" />
          <span>Favourite Genres</span>
        </div>
        <ChipGroup
          options={GENRE_OPTIONS}
          selected={genres}
          onChange={setGenres}
          helperText="Select the primary genres you enjoy listening to across MUSIFY."
        />
      </div>

      {/* Favourite Languages */}
      <div className="space-y-3 border-t border-white/5 pt-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Languages className="h-4 w-4 text-accent-400" />
          <span>Preferred Languages</span>
        </div>
        <ChipGroup
          options={LANGUAGE_OPTIONS}
          selected={languages}
          onChange={setLanguages}
          helperText="Select languages for charts, new releases, and personalized radio."
        />
      </div>

      {/* Favourite Moods */}
      <div className="space-y-3 border-t border-white/5 pt-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Smile className="h-4 w-4 text-accent-400" />
          <span>Favourite Moods & Vibes</span>
        </div>
        <ChipGroup
          options={MOOD_OPTIONS}
          selected={moods}
          onChange={setMoods}
          helperText="Used by the AI Studio and time-of-day recommendation engine."
        />
      </div>

      {/* Favourite Artists */}
      <div className="space-y-3 border-t border-white/5 pt-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Mic2 className="h-4 w-4 text-accent-400" />
          <span>Favourite Artists</span>
        </div>
        <TagInput
          tags={artists}
          onChange={setArtists}
          placeholder="Type artist name and press Enter (e.g. Arijit Singh, Taylor Swift)..."
          maxTags={25}
          helperText="Add artist names to increase their presence in your daily mix and discover feeds."
        />
      </div>

      {/* Favourite Albums */}
      <div className="space-y-3 border-t border-white/5 pt-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Disc3 className="h-4 w-4 text-accent-400" />
          <span>Favourite Albums</span>
        </div>
        <TagInput
          tags={albums}
          onChange={setAlbums}
          placeholder="Type album title and press Enter (e.g. Aashiqui 2, Midnights)..."
          maxTags={25}
          helperText="Add favorite album titles to guide related discography recommendations."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
        <button
          type="button"
          onClick={handleReset}
          disabled={!isDirty || updatePreferencesMutation.isPending}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>

        <button
          type="submit"
          disabled={!isDirty || updatePreferencesMutation.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-accent-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-accent-500 disabled:opacity-40 transition-all shadow-lg shadow-accent-950/40"
        >
          {updatePreferencesMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving Preferences...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </form>
  );
}
