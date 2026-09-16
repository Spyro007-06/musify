'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { usePlayerStore } from '@/stores/player-store';
import {
  useDashboardRecommendations,
  useDiscoverWeekly,
  useRecommendedSongs,
  useRecommendedAlbums,
  useRecommendedArtists,
} from '@/hooks/use-recommendations';
import { DiscoverWeeklyHero } from '@/components/discover/discover-weekly-hero';
import { MusicSection } from '@/components/music/music-section';
import { TrackRow } from '@/components/music/track-row';
import { AlbumCard } from '@/components/music/album-card';
import { ArtistCard } from '@/components/music/artist-card';
import { CategoryCard } from '@/components/music/category-card';
import { Track } from '@/types/track';
import { Album } from '@/types/album';
import { Artist } from '@/types/artist';
import { Category } from '@/types/category';

export default function DiscoverPage() {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const playTrack = usePlayerStore((s) => s.playTrack);

  // Authenticated-only queries
  const {
    data: discoverWeeklyTracks,
    isLoading: isDiscoverWeeklyLoading,
  } = useDiscoverWeekly();

  const {
    data: recommendedSongs,
    isLoading: isSongsLoading,
    isError: isSongsError,
    error: songsError,
    refetch: refetchSongs,
  } = useRecommendedSongs();

  const {
    data: recommendedAlbums,
    isLoading: isAlbumsLoading,
    isError: isAlbumsError,
    error: albumsError,
    refetch: refetchAlbums,
  } = useRecommendedAlbums();

  const {
    data: recommendedArtists,
    isLoading: isArtistsLoading,
    isError: isArtistsError,
    error: artistsError,
    refetch: refetchArtists,
  } = useRecommendedArtists();

  // Optional-auth dashboard recommendations (cold-start for guests, custom sections for users)
  const {
    data: dashboardSections,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardRecommendations();

  // Playback handlers providing full collection as queue context
  const handlePlayRecommendedSong = React.useCallback(
    (track: Track) => {
      playTrack(track, recommendedSongs || [track]);
    },
    [playTrack, recommendedSongs]
  );

  const handlePlaySectionTrack = React.useCallback(
    (track: Track, contextTracks: Track[]) => {
      playTrack(track, contextTracks);
    },
    [playTrack]
  );

  return (
    <div className="space-y-10 pb-12">
      {/* 1. Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Discover
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400">
          Explore personalized mixtapes, fresh album drops, and emerging artists chosen for you.
        </p>
      </div>

      {/* 2. Featured Discover Weekly Hero */}
      <DiscoverWeeklyHero
        tracks={discoverWeeklyTracks}
        isLoading={isAuthenticated && isDiscoverWeeklyLoading}
        isGuest={!isAuthenticated && !isInitializing}
      />

      {/* 3. Authenticated Personalized Sections */}
      {isAuthenticated && (
        <>
          {/* Recommended Songs */}
          <MusicSection
            title="Recommended Songs"
            subtitle="Tracks tailored to your listening habits and favourite genres"
            isLoading={isSongsLoading}
            isError={isSongsError}
            error={songsError as Error | null}
            onRetry={refetchSongs}
            isEmpty={!recommendedSongs || recommendedSongs.length === 0}
            emptyMessage="We're still learning your taste. Listen to a few tracks to receive personalized song recommendations."
            skeletonType="row"
            skeletonCount={6}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {recommendedSongs?.slice(0, 10).map((track, i) => (
                <TrackRow
                  key={`rec-song-${track.id}-${i}`}
                  track={track}
                  index={i}
                  onPlay={handlePlayRecommendedSong}
                />
              ))}
            </div>
          </MusicSection>

          {/* Recommended Albums */}
          <MusicSection
            title="Recommended Albums"
            subtitle="Albums from artists you follow and related sounds"
            isLoading={isAlbumsLoading}
            isError={isAlbumsError}
            error={albumsError as Error | null}
            onRetry={refetchAlbums}
            isEmpty={!recommendedAlbums || recommendedAlbums.length === 0}
            emptyMessage="No album recommendations yet. Try exploring categories or following artists."
            skeletonType="album"
            skeletonCount={6}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recommendedAlbums?.slice(0, 12).map((album) => (
                <AlbumCard key={`rec-alb-${album.id}`} album={album} />
              ))}
            </div>
          </MusicSection>

          {/* Recommended Artists */}
          <MusicSection
            title="Recommended Artists"
            subtitle="Artists similar to the music you enjoy most"
            isLoading={isArtistsLoading}
            isError={isArtistsError}
            error={artistsError as Error | null}
            onRetry={refetchArtists}
            isEmpty={!recommendedArtists || recommendedArtists.length === 0}
            emptyMessage="No artist recommendations yet. Start playing music to discover similar artists."
            skeletonCount={6}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recommendedArtists?.slice(0, 12).map((artist) => (
                <ArtistCard key={`rec-art-${artist.id}`} artist={artist} />
              ))}
            </div>
          </MusicSection>
        </>
      )}

      {/* 4. Dashboard / Guest Discovery Sections */}
      {dashboardSections && dashboardSections.length > 0 && (
        <div className="space-y-10">
          {dashboardSections.map((section) => {
            if (!section.items || section.items.length === 0) return null;

            if (section.type === 'tracks') {
              const tracks = section.items as Track[];
              return (
                <MusicSection
                  key={section.id}
                  title={section.title}
                  subtitle={section.subtitle}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {tracks.slice(0, 10).map((track, i) => (
                      <TrackRow
                        key={`dash-track-${track.id}-${i}`}
                        track={track}
                        index={i}
                        onPlay={(t) => handlePlaySectionTrack(t, tracks)}
                      />
                    ))}
                  </div>
                </MusicSection>
              );
            }

            if (section.type === 'albums') {
              const albums = section.items as Album[];
              return (
                <MusicSection
                  key={section.id}
                  title={section.title}
                  subtitle={section.subtitle}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {albums.slice(0, 12).map((album) => (
                      <AlbumCard key={`dash-alb-${album.id}`} album={album} />
                    ))}
                  </div>
                </MusicSection>
              );
            }

            if (section.type === 'artists') {
              const artists = section.items as Artist[];
              return (
                <MusicSection
                  key={section.id}
                  title={section.title}
                  subtitle={section.subtitle}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {artists.slice(0, 12).map((artist) => (
                      <ArtistCard key={`dash-art-${artist.id}`} artist={artist} />
                    ))}
                  </div>
                </MusicSection>
              );
            }

            if (section.type === 'categories') {
              const categories = section.items as Category[];
              return (
                <MusicSection
                  key={section.id}
                  title={section.title}
                  subtitle={section.subtitle}
                  seeAllHref="/browse"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                    {categories.slice(0, 8).map((cat) => (
                      <CategoryCard key={`dash-cat-${cat.id}`} category={cat} />
                    ))}
                  </div>
                </MusicSection>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Guest loading/error state if dashboard is loading */}
      {!isAuthenticated && isDashboardLoading && (
        <MusicSection
          title="Trending Discoveries"
          isLoading={true}
          skeletonType="row"
          skeletonCount={6}
        >
          <div />
        </MusicSection>
      )}

      {!isAuthenticated && isDashboardError && (
        <MusicSection
          title="Discover Music"
          isError={true}
          error={dashboardError as Error | null}
          onRetry={refetchDashboard}
        >
          <div />
        </MusicSection>
      )}
    </div>
  );
}
