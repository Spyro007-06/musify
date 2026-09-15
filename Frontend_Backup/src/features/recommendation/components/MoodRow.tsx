"use client";

import { useRouter } from "next/navigation";

const MOODS = [
  {
    id: "focus",
    name: "Deep Focus",
    gradient: "from-[#4720ca] to-[#0b0b0f]",
    image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80",
    query: "focus lofi study instrumentals",
  },
  {
    id: "energy",
    name: "Energy Boost",
    gradient: "from-[#1ed760] to-[#0b0b0f]",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80",
    query: "workout electronic hype pop",
  },
  {
    id: "chill",
    name: "Chill Vibes",
    gradient: "from-[#ff6584] to-[#0b0b0f]",
    image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80",
    query: "chill pop acoustic relaxed lofi",
  },
  {
    id: "melancholy",
    name: "Midnight Moods",
    gradient: "from-[#8cbeff] to-[#0b0b0f]",
    image: "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=400&q=80",
    query: "sad indie acoustic melancholic night",
  },
];

export function MoodRow() {
  const router = useRouter();

  const handleMoodClick = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="pb-12">
      <h2 className="text-2xl font-bold text-white tracking-tight mb-6">Choose Your Mood</h2>
      <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-4 -mx-6 px-6">
        {MOODS.map((mood) => (
          <div
            key={mood.id}
            onClick={() => handleMoodClick(mood.query)}
            className="flex-shrink-0 w-64 h-32 rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5 hover:border-white/10 transition-all duration-300"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${mood.gradient} z-0 opacity-80`} />
            <div
              className="absolute inset-0 opacity-40 mix-blend-overlay z-10 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${mood.image})` }}
            />
            <div className="relative z-20 h-full flex flex-col justify-end p-4">
              <span className="font-bold text-lg text-white drop-shadow-md transition-transform duration-300 group-hover:translate-x-1">
                {mood.name}
              </span>
              <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider mt-1 group-hover:text-white/70 transition-colors">
                Explore Playlist &rarr;
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
export default MoodRow;
