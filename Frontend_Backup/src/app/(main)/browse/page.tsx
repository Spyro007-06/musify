"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { musicService } from "@/services/music";
import { AlbumCard } from "@/shared/components/cards/AlbumCard";

const GENRES = [
  { name: "Electronic", img: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80", count: "120K tracks" },
  { name: "Acoustic Pop", img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80", count: "90K tracks" },
  { name: "Ambient Chillout", img: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80", count: "140K tracks" },
  { name: "Synthwave", img: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80", count: "80K tracks" },
];

export default function BrowsePage() {
  const router = useRouter();

  const { data: releases = [] } = useQuery({
    queryKey: ["browse-releases"],
    queryFn: () => musicService.getNewReleases(),
  });

  return (
    <div className="space-y-12 select-none">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Browse</h2>
        <p className="text-white/40 text-xs">Explore new genres, curated tracklists, and releases.</p>
      </div>

      {/* Featured Genres */}
      <section>
        <h3 className="text-lg font-bold text-white mb-6">Featured Genres</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {GENRES.map((genre, idx) => (
            <div
              key={idx}
              onClick={() => router.push(`/search?q=${encodeURIComponent(genre.name)}`)}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer border border-white/5"
            >
              <div className="absolute inset-0 bg-black/50 z-10 group-hover:bg-black/30 transition-colors" />
              <Image
                src={genre.img}
                alt={genre.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-4">
                <span className="font-bold text-white text-base leading-tight">{genre.name}</span>
                <span className="text-white/40 text-[10px] uppercase font-bold mt-1 tracking-wider">{genre.count}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Albums */}
      <section className="pb-12">
        <h3 className="text-lg font-bold text-white mb-6">Trending Albums</h3>
        <div className="flex gap-6 overflow-x-auto hide-scrollbar">
          {releases.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
          {releases.length === 0 && (
            <div className="text-center py-12 w-full">
              <p className="text-xs text-white/40">No trending albums found</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
