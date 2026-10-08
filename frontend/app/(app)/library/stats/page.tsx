'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChartColumn, ChevronLeft, ChevronRight, Play, Compass, Share2, Loader2 } from 'lucide-react';
import { useListeningStats } from '@/hooks/use-user';
import { usePlayerStore } from '@/stores/player-store';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from '@/stores/toast-store';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { formatNumber } from '@/lib/utils/format-number';
import { pluralize } from '@/lib/utils/pluralize';
import { ListeningStats } from '@/types/user';

/** This device's month: the backend counts months from local midnight too (tzOffset). */
const thisMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** 1,284 stays exact; 12.9K compacts. */
const compact = (n: number) => (n < 10_000 ? n.toLocaleString() : formatNumber(n));

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function StatsPage() {
  const [month, setMonth] = React.useState(thisMonth);
  const { data: stats, isLoading, isError, error, refetch } = useListeningStats(month);
  const isCurrent = month === thisMonth();

  return (
    <div className="space-y-8 pb-16">
      <div className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-950/70 via-teal-950/40 to-black p-6 sm:p-8 shadow-2xl">
        <div className="pointer-events-none absolute -left-12 -top-12 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:gap-8 sm:text-left">
          <div className="flex aspect-square w-32 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-teal-600 to-cyan-600 shadow-2xl shadow-brand-950/60 sm:w-40">
            <ChartColumn className="h-16 w-16 stroke-[2.5] text-black" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-400">
              Your month in music
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">{monthLabel(month)}</h1>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <button
                type="button"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                disabled={isCurrent}
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {isCurrent && <span className="text-xs text-neutral-400">So far this month</span>}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <StatsSkeleton />
      ) : isError || !stats ? (
        <ErrorState
          variant="danger"
          title="Couldn't load your stats"
          message={error?.message || 'Something went wrong. Please try again.'}
          onRetry={() => refetch()}
        />
      ) : stats.plays === 0 && stats.skips === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/20 p-12 text-center">
          <h2 className="text-base font-bold text-white">Nothing played in {monthLabel(month)}</h2>
          <p className="mt-1 max-w-sm text-xs text-neutral-400">
            {isCurrent ? 'Play some songs and your stats will start filling in.' : 'Try another month.'}
          </p>
          {isCurrent && (
            <Link
              href="/discover"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Discover music</span>
            </Link>
          )}
        </div>
      ) : (
        <StatsBody stats={stats} month={month} />
      )}
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-neutral-900/50 p-4 sm:p-5">
      <p className="text-xs font-medium text-neutral-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{value}</p>
      {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
    </div>
  );
}

/**
 * Makes the month's story card (app/wrapped-card) and opens the phone's
 * share sheet with it (Instagram, WhatsApp…); browsers that can't share
 * files save the image instead.
 */
function ShareMonthButton({ stats, month }: { stats: ListeningStats; month: string }) {
  const name = useAuthStore((s) => s.user?.displayName || s.user?.username || '');
  const [busy, setBusy] = React.useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const res = await fetch('/wrapped-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          name,
          minutesListened: stats.minutesListened,
          plays: stats.plays,
          uniqueArtists: stats.uniqueArtists,
          // All the song's artists, as the app shows them: the first is often its composer.
          topTracks: stats.topTracks.map(({ track }) => ({
            title: track.title,
            artist: track.artists?.map((a) => a.name).join(', '),
            artwork: track.artwork,
          })),
          topArtists: stats.topArtists.map((a) => ({ name: a.name, image: a.image })),
          topLanguages: stats.topLanguages.map((l) => ({ name: l.name })),
        }),
      });
      if (!res.ok) throw new Error(`card ${res.status}`);
      const file = new File([await res.blob()], `musify-${month}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My ${monthLabel(month)} on Musify` });
      } else {
        const url = URL.createObjectURL(file);
        Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
    } catch (err) {
      // Closing the share sheet isn't an error.
      if ((err as Error)?.name !== 'AbortError') toast.error("Couldn't make your card. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-brand-950/40 transition-colors hover:bg-brand-400 disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      <span>{busy ? 'Making your card…' : 'Share my month'}</span>
    </button>
  );
}

function StatsBody({ stats, month }: { stats: ListeningStats; month: string }) {
  const playFrom = usePlayerStore((s) => s.playFrom);
  const topTracks = stats.topTracks.map((t) => t.track);
  const source = `Your top songs · ${monthLabel(month)}`;
  const maxLanguagePlays = Math.max(1, ...stats.topLanguages.map((l) => l.plays));

  return (
    <div className="space-y-10">
      <ShareMonthButton stats={stats} month={month} />
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Minutes listened" value={compact(stats.minutesListened)} />
        <StatTile label="Songs played" value={compact(stats.plays)} note={pluralize(stats.skips, 'skip')} />
        <StatTile label="Different songs" value={compact(stats.uniqueTracks)} />
        <StatTile label="Artists" value={compact(stats.uniqueArtists)} />
      </section>

      {stats.topTracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">Top songs</h2>
            <button
              type="button"
              onClick={() => playFrom(source, topTracks[0], topTracks)}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-black hover:bg-brand-400"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Play all</span>
            </button>
          </div>
          <ol className="space-y-1">
            {stats.topTracks.map(({ track, plays }, i) => (
              <li key={track.id}>
                <button
                  type="button"
                  onClick={() => playFrom(source, track, topTracks)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.06] focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                >
                  <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-neutral-400">{i + 1}</span>
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-800">
                    <ImageWithFallback src={track.artwork} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                    <p className="truncate text-xs text-neutral-400">
                      {track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-neutral-400">{pluralize(plays, 'play')}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {stats.topArtists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">Top artists</h2>
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {stats.topArtists.map((artist, i) => (
              <li key={artist.id}>
                <Link
                  href={`/artists/${encodeURIComponent(artist.id)}`}
                  className="group block rounded-2xl p-3 text-center hover:bg-white/[0.06] focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                >
                  <div className="relative mx-auto aspect-square w-full max-w-[140px] overflow-hidden rounded-full bg-neutral-800">
                    <ImageWithFallback src={artist.image} alt="" fill sizes="140px" className="object-cover" />
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold text-white">
                    <span className="text-neutral-400">{i + 1}.</span> {artist.name}
                  </p>
                  <p className="text-xs text-neutral-400">{pluralize(artist.plays, 'play')}</p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {stats.topLanguages.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">Plays by language</h2>
          <ul className="max-w-xl space-y-3">
            {stats.topLanguages.map((lang) => (
              <li
                key={lang.name}
                className="grid grid-cols-[6rem_1fr] items-center gap-3"
                title={`${capitalize(lang.name)}: ${pluralize(lang.plays, 'play')}`}
              >
                <span className="truncate text-sm text-neutral-300">{capitalize(lang.name)}</span>
                <span className="flex items-center gap-2">
                  {/* One series, one hue: magnitude only, rounded at the data end. */}
                  <span
                    className="h-3 rounded-r bg-brand-500"
                    style={{ width: `${Math.max(2, (lang.plays / maxLanguagePlays) * 100)}%` }}
                  />
                  <span className="shrink-0 text-xs tabular-nums text-neutral-400">{lang.plays}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-10" aria-label="Loading your stats">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl bg-neutral-800/60" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl bg-neutral-800/60" />
        ))}
      </div>
    </div>
  );
}
