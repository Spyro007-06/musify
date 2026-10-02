'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTrending, useNewReleases, useRecommended, useCategories, useLikedSongs, useRecentlyPlayed, useTopHits } from '@/hooks/use-music';
import { usePlaylists } from '@/hooks/use-playlists';
import { useDiscoverWeekly, useRecommendedArtists } from '@/hooks/use-recommendations';
import { useAuthStore } from '@/stores/auth-store';
import { HomeHeader } from '@/components/home/home-header';
import { ShortcutGrid } from '@/components/home/shortcut-grid';
import { PlaylistRow, PlaylistShelf } from '@/components/home/playlist-row';
import { MusicSection } from '@/components/music/music-section';
import { DiscoverWeeklyHero } from '@/components/discover/discover-weekly-hero';
import { TrackCard } from '@/components/music/track-card';
import { AlbumCard } from '@/components/music/album-card';
import { CategoryCard } from '@/components/music/category-card';
import { PlaylistCard } from '@/components/music/playlist-card';
import { MixCard } from '@/components/music/mix-card';
import { ShelfRow, ShelfItem } from '@/components/music/shelf-row';
import { artistsApi } from '@/lib/api/artists';
import { playlistsApi } from '@/lib/api/playlists';
import { Track } from '@/types/track';
import { Album } from '@/types/album';
import { Playlist } from '@/types/playlist';
import { usePlayerStore } from '@/stores/player-store';
import { sessionShuffle } from '@/lib/utils/session-shuffle';

// Editorial playlist rows. Each is a JioSaavn playlist search biased toward
// the user's language/genre on the backend; every app open shows a
// different MOOD_ROWS_SHOWN of them, in a different order.
const MOOD_ROWS = [
  { title: 'Party', query: 'party' },
  { title: 'Chill', query: 'chill' },
  { title: 'Romance', query: 'romance' },
  { title: 'Sad songs', query: 'sad' },
  { title: 'Happy', query: 'happy' },
  { title: 'Dance', query: 'dance' },
  { title: 'Throwback', query: '90s' },
  { title: 'Rain & Chill', query: 'rain' },
  { title: 'Workout', query: 'workout' },
  { title: 'Retro', query: 'retro' },
  { title: 'Road trip', query: 'road trip' },
  { title: 'Devotional', query: 'devotional' },
  { title: 'Unplugged', query: 'unplugged' },
  { title: 'Indie', query: 'indie' },
  { title: 'Feel good', query: 'feel good' },
  { title: 'Lo-fi', query: 'lofi' },
];
const MOOD_ROWS_SHOWN = 8;

/** Unique albums in the order their tracks appear. */
function albumsFromTracks(tracks: Track[]): Album[] {
  const seen = new Map<string, Album>();
  for (const t of tracks) {
    if (!t.album?.id || seen.has(t.album.id)) continue;
    seen.set(t.album.id, {
      id: t.album.id,
      title: t.album.title || t.title,
      artwork: t.album.artwork || t.artwork,
      artist: t.artists?.[0],
    });
  }
  return [...seen.values()];
}

/** Artists ranked by how many of these tracks they're on, with a cover from their first track. */
function topArtists(tracks: Track[]): { id: string; name: string; cover?: string | null; with: string[] }[] {
  const counts = new Map<string, { id: string; name: string; cover?: string | null; n: number; with: Set<string> }>();
  for (const t of tracks) {
    const [main, ...rest] = t.artists || [];
    if (!main?.id || main.id === 'unknown-artist') continue;
    const entry = counts.get(main.id) ?? { id: main.id, name: main.name, cover: t.artwork, n: 0, with: new Set<string>() };
    entry.n += 1;
    rest.forEach((a) => a.name && entry.with.add(a.name));
    counts.set(main.id, entry);
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).map((a) => ({ ...a, with: [...a.with].slice(0, 3) }));
}

export default function HomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const playFrom = usePlayerStore((s) => s.playFrom);
  const { isAuthenticated, isInitializing } = useAuthStore();

  const { data: discoverWeeklyTracks, isLoading: isDiscoverWeeklyLoading } = useDiscoverWeekly();
  const trending = useTrending();
  const newReleases = useNewReleases();
  const recommended = useRecommended();
  const categories = useCategories();
  const topHits = useTopHits();
  const playlists = usePlaylists();
  const { data: likedTracks } = useLikedSongs();
  const { data: recentTracks } = useRecentlyPlayed();
  const { data: stationArtists } = useRecommendedArtists();

  // Picked after mount: the server render can't know this session's pick.
  const [moodRows, setMoodRows] = React.useState<typeof MOOD_ROWS>([]);
  React.useEffect(() => setMoodRows(sessionShuffle(MOOD_ROWS).slice(0, MOOD_ROWS_SHOWN)), []);

  // A different slice of each pool every app open. Cards play the shuffled
  // list, so what comes next is what's shown next.
  const trendingTracks = React.useMemo(() => sessionShuffle(trending.data || []), [trending.data]);
  const recommendedTracks = React.useMemo(() => sessionShuffle(recommended.data || []), [recommended.data]);
  const newReleaseAlbums = React.useMemo(() => sessionShuffle(newReleases.data || []), [newReleases.data]);
  const stations = React.useMemo(() => sessionShuffle(stationArtists || []), [stationArtists]);

  const recent = React.useMemo(() => recentTracks || [], [recentTracks]);
  const recentAlbums = React.useMemo(() => albumsFromTracks(recent), [recent]);
  const likedAlbums = React.useMemo(() => albumsFromTracks(likedTracks || []), [likedTracks]);
  const mixArtists = React.useMemo(() => topArtists([...recent, ...(likedTracks || [])]).slice(0, 6), [recent, likedTracks]);
  const userPlaylists = React.useMemo(
    () => (playlists.data || []).filter((p) => !p.id.startsWith('movie-') && p.owner !== 'Movie Soundtrack'),
    [playlists.data]
  );
  const soundtrackPlaylists = React.useMemo(
    () => (playlists.data || []).filter((p) => p.id.startsWith('movie-') || p.owner === 'Movie Soundtrack'),
    [playlists.data]
  );

  // "More of what you like" drops anything already in the trending row so
  // the same song doesn't repeat on one page.
  const recommendedShelfTracks = React.useMemo(() => {
    const shown = new Set(trendingTracks.slice(0, 12).map((t) => t.id));
    return recommendedTracks.filter((t) => !shown.has(t.id)).slice(0, 12);
  }, [recommendedTracks, trendingTracks]);

  // Stations and mixes play the artist's top songs straight away.
  // ponytail: an artist's top tracks stand in for a real radio (similar
  // artists mixed in); blend in /artists/:id/related if that feels too narrow.
  const playArtist = React.useCallback(
    async (artistId: string, source: string) => {
      const tracks = await queryClient.fetchQuery({
        queryKey: ['artists', artistId, 'top-tracks', isAuthenticated],
        queryFn: async () => (await artistsApi.getTopTracks(artistId)).data || [],
        staleTime: 1000 * 60 * 5,
      });
      if (tracks.length > 0) playFrom(source, tracks[0], tracks);
    },
    [queryClient, isAuthenticated, playFrom]
  );

  const playPlaylist = React.useCallback(
    async (playlist: Playlist) => {
      const full = await queryClient.fetchQuery({
        queryKey: ['playlists', 'detail', playlist.id],
        queryFn: async () => (await playlistsApi.getPlaylist(playlist.id)).data || null,
        staleTime: 1000 * 60 * 2,
      });
      const tracks = full?.tracks || [];
      if (tracks.length > 0) playFrom(playlist.title, tracks[0], tracks);
      else router.push(`/playlists/${playlist.id}`);
    },
    [queryClient, playFrom, router]
  );

  // Album cards only carry summary metadata, so open the page unless tracks are already loaded.
  const playAlbum = React.useCallback(
    (album: Album) => {
      if (album.tracks && album.tracks.length > 0) playFrom(album.title, album.tracks[0], album.tracks);
      else router.push(`/albums/${album.id}`);
    },
    [playFrom, router]
  );

  const hasLibrary = isAuthenticated && !isInitializing;
  const topArtist = mixArtists[0];

  return (
    <div className="space-y-10 pb-12">
      <HomeHeader />

      <ShortcutGrid
        hasLibrary={hasLibrary}
        playlists={userPlaylists}
        recentAlbums={recentAlbums}
        recentTracks={recent}
        fallbackTracks={trendingTracks}
        onPlayTrack={(t, q) => playFrom(hasLibrary && recent.length > 0 ? 'Recently Played' : 'Trending Now', t, q)}
      />

      <PlaylistShelf title="Today's biggest hits" result={topHits} onPlay={playPlaylist} />

      {stations.length > 0 && (
        <MusicSection title="Recommended Stations">
          <ShelfRow>
            {stations.slice(0, 10).map((artist) => (
              <ShelfItem key={`station-${artist.id}`}>
                <MixCard
                  badge="RADIO"
                  title={`${artist.name} Radio`}
                  subtitle={`Songs by ${artist.name}`}
                  cover={artist.image}
                  onPlay={() => playArtist(artist.id, `${artist.name} Radio`)}
                />
              </ShelfItem>
            ))}
          </ShelfRow>
        </MusicSection>
      )}

      {recent.length > 0 && (
        <MusicSection title="Recents" seeAllHref="/library/recently-played">
          <ShelfRow>
            {recent.slice(0, 12).map((track, i) => (
              <ShelfItem key={`recent-${track.id}-${i}`}>
                <TrackCard track={track} onPlay={(t) => playFrom('Recently Played', t, recent)} />
              </ShelfItem>
            ))}
          </ShelfRow>
        </MusicSection>
      )}

      <MusicSection
        title="More of what you like"
        subtitle={
          recommended.personalizedBasis === 'history'
            ? 'Inspired by your listening history'
            : recommended.personalizedBasis === 'taste'
            ? 'Picked to match your favourite genres'
            : recommended.personalizedBasis === 'language'
            ? 'Fresh picks in your preferred languages'
            : 'Popular picks to get you started — tune your taste in Settings'
        }
        isLoading={recommended.isLoading}
        isError={recommended.isError}
        error={recommended.error}
        onRetry={recommended.refetch}
        isEmpty={recommendedShelfTracks.length === 0}
        skeletonType="card"
        skeletonCount={6}
      >
        <ShelfRow>
          {recommendedShelfTracks.map((track) => (
            <ShelfItem key={`rec-${track.id}`}>
              <TrackCard track={track} onPlay={(t) => playFrom('More of what you like', t, recommendedTracks)} />
            </ShelfItem>
          ))}
        </ShelfRow>
      </MusicSection>

      {mixArtists.length > 0 && (
        <MusicSection title="Your top mixes">
          <ShelfRow>
            {mixArtists.map((artist) => (
              <ShelfItem key={`mix-${artist.id}`}>
                <MixCard
                  badge="MIX"
                  title={`${artist.name} Mix`}
                  subtitle={artist.with.length > 0 ? `${artist.with.join(', ')} and more` : `The best of ${artist.name}`}
                  cover={artist.cover}
                  onPlay={() => playArtist(artist.id, `${artist.name} Mix`)}
                />
              </ShelfItem>
            ))}
          </ShelfRow>
        </MusicSection>
      )}

      <MusicSection
        title="Trending Now"
        subtitle="The most played and viral tracks this week"
        isLoading={trending.isLoading}
        isError={trending.isError}
        error={trending.error}
        onRetry={trending.refetch}
        isEmpty={trendingTracks.length === 0}
        skeletonType="card"
        skeletonCount={6}
      >
        <ShelfRow>
          {trendingTracks.slice(0, 12).map((track) => (
            <ShelfItem key={track.id}>
              <TrackCard track={track} onPlay={(t) => playFrom('Trending Now', t, trendingTracks)} />
            </ShelfItem>
          ))}
        </ShelfRow>
      </MusicSection>

      <MusicSection
        title="New Releases"
        subtitle="Fresh albums and singles just dropped"
        isLoading={newReleases.isLoading}
        isError={newReleases.isError}
        error={newReleases.error}
        onRetry={newReleases.refetch}
        isEmpty={newReleaseAlbums.length === 0}
        skeletonType="album"
        skeletonCount={6}
      >
        <ShelfRow>
          {newReleaseAlbums.slice(0, 12).map((album) => (
            <ShelfItem key={album.id}>
              <AlbumCard album={album} onPlay={playAlbum} />
            </ShelfItem>
          ))}
        </ShelfRow>
      </MusicSection>

      {moodRows.map((row) => (
        <PlaylistRow key={row.query} title={row.title} query={row.query} onPlay={playPlaylist} />
      ))}

      {recentAlbums.length > 0 && (
        <MusicSection title="Jump back in">
          <ShelfRow>
            {recentAlbums.slice(0, 12).map((album) => (
              <ShelfItem key={`jump-${album.id}`}>
                <AlbumCard album={album} onPlay={playAlbum} />
              </ShelfItem>
            ))}
          </ShelfRow>
        </MusicSection>
      )}

      {soundtrackPlaylists.length > 0 && (
        <MusicSection title="Soundtracks & Curations" seeAllHref="/library/playlists">
          <ShelfRow>
            {soundtrackPlaylists.slice(0, 12).map((playlist) => (
              <ShelfItem key={`soundtrack-${playlist.id}`}>
                <PlaylistCard playlist={playlist} />
              </ShelfItem>
            ))}
          </ShelfRow>
        </MusicSection>
      )}

      {topArtist && <PlaylistRow title={`Discover more from ${topArtist.name}`} query={topArtist.name} onPlay={playPlaylist} />}

      {likedAlbums.length > 0 && (
        <MusicSection title="Albums featuring songs you like" seeAllHref="/library/liked">
          <ShelfRow>
            {likedAlbums.slice(0, 12).map((album) => (
              <ShelfItem key={`liked-album-${album.id}`}>
                <AlbumCard album={album} onPlay={playAlbum} />
              </ShelfItem>
            ))}
          </ShelfRow>
        </MusicSection>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Discover</h2>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              Your personalized mixtape, fresh drops, and artists picked for you
            </p>
          </div>
          <Link
            href="/discover"
            className="group flex items-center gap-1 shrink-0 text-xs sm:text-sm font-semibold text-neutral-400 hover:text-brand-400 transition-colors"
          >
            <span>See all</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <DiscoverWeeklyHero
          tracks={discoverWeeklyTracks}
          isLoading={isAuthenticated && isDiscoverWeeklyLoading}
          isGuest={!isAuthenticated && !isInitializing}
        />
      </section>

      <MusicSection
        title="Explore Genres & Categories"
        subtitle="Browse top genres, regional hits, and cultural sounds"
        seeAllHref="/browse"
        isLoading={categories.isLoading}
        isError={categories.isError}
        error={categories.error}
        onRetry={categories.refetch}
        isEmpty={!categories.data || categories.data.length === 0}
        skeletonType="category"
        skeletonCount={4}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.data?.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </MusicSection>
    </div>
  );
}
