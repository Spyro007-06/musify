'use client';

import * as React from 'react';
import { useTrending, useNewReleases, useRecommended, useCategories } from '@/hooks/use-music';
import { HomeHeader } from '@/components/home/home-header';
import { MusicSection } from '@/components/music/music-section';
import { TrackCard } from '@/components/music/track-card';
import { TrackRow } from '@/components/music/track-row';
import { AlbumCard } from '@/components/music/album-card';
import { CategoryCard } from '@/components/music/category-card';
import { MoodSection } from '@/components/music/mood-section';
import { Track } from '@/types/track';
import { Album } from '@/types/album';
import { usePlayerStore } from '@/stores/player-store';

export default function HomePage() {
  const playTrack = usePlayerStore((s) => s.playTrack);

  const {
    data: trendingTracks,
    isLoading: isTrendingLoading,
    isError: isTrendingError,
    error: trendingError,
    refetch: refetchTrending,
  } = useTrending();

  const {
    data: newReleases,
    isLoading: isNewReleasesLoading,
    isError: isNewReleasesError,
    error: newReleasesError,
    refetch: refetchNewReleases,
  } = useNewReleases();

  const {
    data: recommendedTracks,
    isLoading: isRecommendedLoading,
    isError: isRecommendedError,
    error: recommendedError,
    refetch: refetchRecommended,
  } = useRecommended();

  const {
    data: categories,
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories();

  // Play handlers passing full section collections as queue context
  const handlePlayTrending = React.useCallback(
    (track: Track) => {
      playTrack(track, trendingTracks || [track]);
    },
    [playTrack, trendingTracks]
  );

  const handlePlayRecommended = React.useCallback(
    (track: Track) => {
      playTrack(track, recommendedTracks || [track]);
    },
    [playTrack, recommendedTracks]
  );

  const handlePlayAlbum = React.useCallback((album: Album) => {
    console.log('Selected album:', album.title);
  }, []);

  return (
    <div className="space-y-10 pb-12">
      {/* Personalized Greeting Header */}
      <HomeHeader />

      {/* Quick Play Rows - Top 6 Trending */}
      {trendingTracks && trendingTracks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Popular Right Now</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {trendingTracks.slice(0, 6).map((track, index) => (
              <TrackRow
                key={`quick-${track.id}-${index}`}
                track={track}
                index={index}
                onPlay={handlePlayTrending}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending Now */}
      <MusicSection
        title="Trending Now"
        subtitle="The most played and viral tracks this week"
        isLoading={isTrendingLoading}
        isError={isTrendingError}
        error={trendingError}
        onRetry={refetchTrending}
        isEmpty={!trendingTracks || trendingTracks.length === 0}
        skeletonType="card"
        skeletonCount={6}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {trendingTracks?.slice(0, 12).map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              onPlay={handlePlayTrending}
            />
          ))}
        </div>
      </MusicSection>

      {/* Explore Categories / Genres */}
      <MusicSection
        title="Explore Genres & Categories"
        subtitle="Browse top genres, regional hits, and cultural sounds"
        seeAllHref="/browse"
        isLoading={isCategoriesLoading}
        isError={isCategoriesError}
        error={categoriesError}
        onRetry={refetchCategories}
        isEmpty={!categories || categories.length === 0}
        skeletonType="category"
        skeletonCount={4}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {categories?.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </MusicSection>

      {/* New Releases */}
      <MusicSection
        title="New Releases"
        subtitle="Fresh albums and singles just dropped"
        isLoading={isNewReleasesLoading}
        isError={isNewReleasesError}
        error={newReleasesError}
        onRetry={refetchNewReleases}
        isEmpty={!newReleases || newReleases.length === 0}
        skeletonType="album"
        skeletonCount={6}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {newReleases?.slice(0, 12).map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onPlay={handlePlayAlbum}
            />
          ))}
        </div>
      </MusicSection>

      {/* Made For You / Recommendations */}
      <MusicSection
        title="Made For You"
        subtitle="Recommendations inspired by your listening history"
        isLoading={isRecommendedLoading}
        isError={isRecommendedError}
        error={recommendedError}
        onRetry={refetchRecommended}
        isEmpty={!recommendedTracks || recommendedTracks.length === 0}
        skeletonType="card"
        skeletonCount={6}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {recommendedTracks?.slice(0, 12).map((track) => (
            <TrackCard
              key={`rec-${track.id}`}
              track={track}
              onPlay={handlePlayRecommended}
            />
          ))}
        </div>
      </MusicSection>

      {/* Moods & Vibes Section */}
      <MoodSection />
    </div>
  );
}
