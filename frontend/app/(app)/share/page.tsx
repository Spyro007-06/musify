'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ListMusic, Loader2, Search } from 'lucide-react';
import { musicApi, SharedLink } from '@/lib/api/music';
import { usePlayerStore } from '@/stores/player-store';
import { useAuthStore } from '@/stores/auth-store';
import { TrackRow } from '@/components/music/track-row';
import { CreatePlaylistModal } from '@/components/playlist/create-playlist-modal';

const APPS = 'Spotify, YouTube, YouTube Music, Apple Music, JioSaavn, Deezer or Gaana';

/**
 * Where Android's share sheet opens Musify (manifest share_target): the
 * link can come in url, or inside text ("Listen to … on JioSaavn https://…").
 */
function ShareTarget() {
  const params = useSearchParams();
  const link = ['url', 'text', 'title'].map((k) => params.get(k) ?? '').join(' ').match(/https?:\/\/\S+/)?.[0] ?? null;
  const [result, setResult] = useState<SharedLink | { error: string } | null>(null);
  const [importOpen, setImportOpen] = useState(true);
  const playFrom = usePlayerStore((s) => s.playFrom);
  const { isAuthenticated, isInitializing } = useAuthStore();

  useEffect(() => {
    if (!link) return;
    musicApi.resolveSharedLink(link).then(
      ({ data }) => {
        if (!data) return setResult({ error: "Couldn't read that link." });
        setResult(data);
        // Autoplay radio carries on with more like it afterwards.
        if (data.kind === 'song' && data.track) playFrom('Shared with you', data.track, [data.track]);
      },
      (err) => setResult({ error: err instanceof Error ? err.message : "Couldn't read that link." })
    );
  }, [link, playFrom]);

  if (!link) return <Note text={`Nothing to open here. Share a song or playlist link from ${APPS}.`} />;
  if (!result || ('kind' in result && result.kind === 'playlist' && isInitializing)) {
    return (
      <p className="flex items-center gap-2 text-sm text-neutral-400" role="status">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening the link…
      </p>
    );
  }
  if ('error' in result) return <Note text={result.error} />;

  if (result.kind === 'song') {
    const { song, track } = result;
    if (!track) {
      const query = `${song.title} ${song.artist}`.trim();
      return <Note text={`Couldn't find "${song.title}"${song.artist ? ` by ${song.artist}` : ''} in Musify.`} searchFor={query} />;
    }
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Shared with you</h1>
        <TrackRow track={track} index={0} onPlay={(t) => playFrom('Shared with you', t, [t])} />
        <p className="text-xs text-neutral-500">More songs like it play after this one.</p>
      </div>
    );
  }

  // A playlist: imported with the usual dialog (that needs an account).
  if (!isAuthenticated) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Import this playlist</h1>
        <p className="text-sm text-neutral-400">Log in to bring this playlist into Musify.</p>
        <Link
          href={`/login?redirect=${encodeURIComponent(`/share?url=${encodeURIComponent(link)}`)}`}
          className="inline-flex rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-black hover:bg-brand-400"
        >
          Log in
        </Link>
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setImportOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-black hover:bg-brand-400"
      >
        <ListMusic className="h-4 w-4" /> Import this playlist
      </button>
      <CreatePlaylistModal isOpen={importOpen} onClose={() => setImportOpen(false)} initialUrl={link} />
    </>
  );
}

function Note({ text, searchFor }: { text: string; searchFor?: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-300">{text}</p>
      <Link
        href={searchFor ? `/search?q=${encodeURIComponent(searchFor)}` : '/search'}
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
      >
        <Search className="h-4 w-4" /> {searchFor ? 'Search for it' : 'Search'}
      </Link>
    </div>
  );
}

export default function SharePage() {
  return (
    <div className="mx-auto max-w-2xl pt-4">
      <Suspense fallback={null}>
        <ShareTarget />
      </Suspense>
    </div>
  );
}
