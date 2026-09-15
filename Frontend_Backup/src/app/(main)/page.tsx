"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { musicService } from "@/services/music";
import { usePlayerStore } from "@/features/player/store/player-store";
import { usePreferencesStore } from "@/features/profile/store/preferences-store";
import dynamic from "next/dynamic";

const PreferencesPicker = dynamic(
  () => import("@/features/recommendation/components/PreferencesPicker").then((mod) => mod.PreferencesPicker),
  { ssr: false }
);

import { MusicCard } from "@/shared/components/cards/MusicCard";
import { AlbumCard } from "@/shared/components/cards/AlbumCard";
import { PlaylistCard } from "@/shared/components/cards/PlaylistCard";
import { ArtistCard } from "@/shared/components/cards/ArtistCard";
import { MoodRow } from "@/features/recommendation/components/MoodRow";
import type { Track } from "@/types/music";

export default function HomePage() {
  const setQueue = usePlayerStore((state) => state.setQueue);
  const { selectedLanguages, selectedArtists, resetPreferences, hasPickedPreferences } = usePreferencesStore();

  // Fetch trending tracks filtered strictly by user preferences to make the hero section personalized
  const { data: trending = [], isLoading: isHeroLoading } = useQuery<Track[]>({
    queryKey: ["trending-tracks", selectedLanguages, selectedArtists],
    queryFn: () =>
      musicService.getTrending(
        hasPickedPreferences ? selectedLanguages : [],
        hasPickedPreferences ? selectedArtists : []
      ),
  });

  // Fetch personalized recommendation dashboard sections dynamically
  const { data: sections = [], isLoading: isRecsLoading } = useQuery<any[]>({
    queryKey: ["dashboard-recommendations", selectedLanguages, selectedArtists],
    queryFn: () => musicService.getDashboardRecommendations(),
    refetchOnWindowFocus: true,
  });

  // Pick the first trending track as the featured song
  const heroTrack = trending[0];

  const playHeroTrack = () => {
    if (heroTrack) {
      setQueue([heroTrack, ...trending.slice(1)], 0);
    }
  };

  return (
    <div className="space-y-12 relative">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
      </div>

      {/* Preferences Picker Overlay (Triggers if not picked yet) */}
      {!hasPickedPreferences && <PreferencesPicker />}

      {/* Top Welcome / Preferences Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Your Musify Dashboard</h1>
          <p className="text-xs text-white/40 mt-1">High-fidelity audio, curated for your journey.</p>
        </div>

        {hasPickedPreferences && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap max-w-xl">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-black">Languages:</span>
                {selectedLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white/80 uppercase tracking-wider"
                  >
                    {lang}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-black">Artists:</span>
                {selectedArtists.slice(0, 4).map((art) => (
                  <span
                    key={art}
                    className="bg-[#4cf479]/10 border border-[#4cf479]/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#4cf479] tracking-wide"
                  >
                    {art}
                  </span>
                ))}
                {selectedArtists.length > 4 && (
                  <span className="text-[10px] text-white/50 font-bold">+{selectedArtists.length - 4} more</span>
                )}
              </div>
            </div>
            <button
              onClick={resetPreferences}
              className="text-[10px] text-[#4cf479] font-black uppercase tracking-wider border border-[#4cf479]/20 hover:border-[#4cf479]/50 px-3 py-1.5 rounded-full transition-all self-start sm:self-center"
            >
              Edit Preferences
            </button>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[32px] min-h-[300px] md:aspect-[21/9] md:min-h-[400px] flex items-center p-6 sm:p-8 md:p-12 shadow-2xl border border-white/5 bg-black/40">
        {isHeroLoading ? (
          <div className="absolute inset-0 bg-white/5 animate-pulse rounded-[32px]" />
        ) : heroTrack ? (
          <>
            <div className="absolute inset-0 z-0">
              {heroTrack.artwork && (
                <>
                  <Image
                    src={heroTrack.artwork}
                    alt={heroTrack.title}
                    fill
                    className="object-cover opacity-40 blur-3xl scale-120 transition-all duration-700"
                    priority
                  />
                  <div className="absolute right-0 top-0 bottom-0 w-full md:w-[60%] h-full hidden md:block">
                    <Image
                      src={heroTrack.artwork}
                      alt={heroTrack.title}
                      fill
                      className="object-cover opacity-45"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0d150d] via-[#0d150d]/70 to-transparent" />
                  </div>
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-transparent" />
            </div>

            <div className="relative z-10 max-w-xl flex gap-6 items-center">
              {heroTrack.artwork && (
                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex-shrink-0 hidden sm:block">
                  <Image
                    src={heroTrack.artwork}
                    alt={heroTrack.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <span className="bg-[#4cf479]/20 text-[#4cf479] border border-[#4cf479]/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 inline-block">
                  Featured Stream
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight line-clamp-1">
                  {heroTrack.title}
                </h2>
                <p className="text-white/70 text-sm mb-5 font-bold">
                  By {heroTrack.artists.map((a) => a.name).join(", ")}
                </p>
                <div className="flex items-center gap-4">
                  <button
                    onClick={playHeroTrack}
                    className="bg-[#4cf479] hover:bg-[#69ff89] text-[#003913] font-bold text-xs px-6 py-3.5 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 neon-glow uppercase tracking-wider"
                  >
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      play_arrow
                    </span>
                    Stream Now
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 z-0">
              <Image
                src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80"
                alt="Neon Nights"
                fill
                className="object-cover opacity-60"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
            </div>

            <div className="relative z-10 max-w-xl">
              <span className="bg-[#4cf479]/20 text-[#4cf479] border border-[#4cf479]/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">
                Trending Album
              </span>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-3 tracking-tight">
                Neon Nights
              </h1>
              <p className="text-white/70 text-sm md:text-base mb-6 max-w-md leading-relaxed">
                Experience the rhythmic pulse of the future with Astra&apos;s latest high-fidelity sonic journey.
              </p>
              <div className="flex items-center gap-4">
                <button
                  className="bg-[#4cf479] hover:bg-[#69ff89] text-[#003913] font-bold text-xs px-6 py-4 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 neon-glow uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                    play_arrow
                  </span>
                  Play Now
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Dynamic Recommendation Sections */}
      {isRecsLoading ? (
        <div className="space-y-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-7 w-48 bg-white/5 rounded-lg animate-pulse" />
              <div className="flex gap-4 sm:gap-6 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="w-48 flex-shrink-0 space-y-3">
                    <div className="aspect-square w-full bg-white/5 rounded-2xl animate-pulse" />
                    <div className="h-4 w-3/4 bg-white/5 rounded-md animate-pulse" />
                    <div className="h-3 w-1/2 bg-white/5 rounded-md animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {sections.map((section) => {
            if (!section.items || section.items.length === 0) return null;
            return (
              <section key={section.id} className="select-none">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{section.title}</h2>
                    <p className="text-xs text-white/40 mt-1">{section.subtitle}</p>
                  </div>
                </div>
                <div className="flex gap-4 sm:gap-6 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
                  {section.items.map((item: any, idx: number) => {
                    if (section.type === "tracks") {
                      return (
                        <div key={`${item.id}-${idx}`} className="flex flex-col gap-1.5 w-48 flex-shrink-0">
                          <MusicCard track={item} tracksQueue={section.items} />
                          {item.reason && (
                            <p className="text-[10px] text-[#4cf479] font-medium line-clamp-2 px-1 opacity-80 leading-snug">
                              ✨ {item.reason}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (section.type === "albums") {
                      return (
                        <div key={`${item.id}-${idx}`} className="flex flex-col gap-1.5 w-48 flex-shrink-0">
                          <AlbumCard album={item} />
                          {item.reason && (
                            <p className="text-[10px] text-[#4cf479] font-medium line-clamp-2 px-1 opacity-80 leading-snug">
                              ✨ {item.reason}
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (section.type === "playlists") {
                      return <PlaylistCard key={`${item.id}-${idx}`} playlist={item} />;
                    }
                    if (section.type === "artists") {
                      return <ArtistCard key={`${item.id}-${idx}`} artist={item} />;
                    }
                    return null;
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Mood Categories Row */}
      <MoodRow />
    </div>
  );
}
