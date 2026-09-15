"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { searchService } from "@/services/search";
import { MusicCard } from "@/shared/components/cards/MusicCard";
import { AlbumCard } from "@/shared/components/cards/AlbumCard";
import { ArtistCard } from "@/shared/components/cards/ArtistCard";
import { PlaylistCard } from "@/shared/components/cards/PlaylistCard";
import type { SearchResult } from "@/types/music";
import Image from "next/image";

const BROWSE_CATEGORIES = [
  { name: "Bollywood Hits", color: "bg-red-500/25 border-red-500/20", img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80" },
  { name: "Punjabi Beats", color: "bg-blue-500/25 border-blue-500/20", img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80" },
  { name: "Indie Pop", color: "bg-green-500/25 border-green-500/20", img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80" },
  { name: "Lo-Fi Lounge", color: "bg-yellow-500/25 border-yellow-500/20", img: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80" },
  { name: "Devotional", color: "bg-purple-500/25 border-purple-500/20", img: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80" },
  { name: "Dance Party", color: "bg-pink-500/25 border-pink-500/20", img: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80" },
];

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams?.get("q") || "";

  const { data: searchResults, isLoading } = useQuery<SearchResult>({
    queryKey: ["search", query],
    queryFn: () => searchService.search(query),
    enabled: !!query,
  });

  return (
    <div className="space-y-12 select-none">
      {query ? (
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
            Search results for &quot;{query}&quot;
          </h2>
          <p className="text-white/40 text-xs mb-8">
            Showing top matches in music, albums, artists and playlists.
          </p>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <span className="material-symbols-outlined text-4xl text-[#4cf479] animate-spin mb-4">
                progress_activity
              </span>
              <p className="text-sm text-white/50">Searching...</p>
            </div>
          ) : searchResults &&
            (searchResults.tracks.length > 0 ||
              searchResults.albums.length > 0 ||
              searchResults.artists.length > 0 ||
              searchResults.playlists.length > 0) ? (
            <div className="space-y-10">
              {/* Songs results */}
              {searchResults.tracks.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-6">Songs</h3>
                  <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-2">
                    {searchResults.tracks.map((track) => (
                      <MusicCard key={track.id} track={track} tracksQueue={searchResults.tracks} />
                    ))}
                  </div>
                </div>
              )}

              {/* Albums results */}
              {searchResults.albums.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-6">Albums</h3>
                  <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-2">
                    {searchResults.albums.map((album) => (
                      <AlbumCard key={album.id} album={album} />
                    ))}
                  </div>
                </div>
              )}

              {/* Artists results */}
              {searchResults.artists.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-6">Artists</h3>
                  <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-2">
                    {searchResults.artists.map((artist) => (
                      <ArtistCard key={artist.id} artist={artist} />
                    ))}
                  </div>
                </div>
              )}

              {/* Playlists results */}
              {searchResults.playlists.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-6">Playlists</h3>
                  <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-2">
                    {searchResults.playlists.map((playlist) => (
                      <PlaylistCard key={playlist.id} playlist={playlist} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-24 glass-card rounded-3xl border border-white/5">
              <span className="material-symbols-outlined text-5xl text-white/20 mb-4">search_off</span>
              <h3 className="text-lg font-bold text-white mb-1">No results found</h3>
              <p className="text-xs text-white/40">Try searching for other keywords.</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Browse Categories */}
          <h2 className="text-2xl font-bold text-white tracking-tight mb-8">Browse All Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {BROWSE_CATEGORIES.map((category, idx) => (
              <div
                key={idx}
                onClick={() => router.push(`/search?q=${encodeURIComponent(category.name)}`)}
                className={`relative rounded-2xl aspect-square overflow-hidden group cursor-pointer border ${category.color} flex flex-col justify-end p-4 transition-all duration-300 hover:scale-[1.04]`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                <Image
                  src={category.img}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <span className="relative z-20 font-bold text-white text-sm md:text-base leading-tight">
                  {category.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
