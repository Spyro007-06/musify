"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePreferencesStore } from "@/features/profile/store/preferences-store";

const LANGUAGES = [
  { id: "english", label: "English", icon: "🇬🇧", color: "from-blue-500 to-indigo-600" },
  { id: "hindi", label: "Hindi", icon: "🇮🇳", color: "from-orange-500 to-red-600" },
  { id: "tamil", label: "Tamil", icon: "🇮🇳", color: "from-emerald-500 to-teal-600" },
  { id: "telugu", label: "Telugu", icon: "🇮🇳", color: "from-yellow-500 to-amber-600" },
  { id: "punjabi", label: "Punjabi", icon: "🇮🇳", color: "from-red-500 to-pink-600" },
  { id: "spanish", label: "Spanish", icon: "🇪🇸", color: "from-purple-500 to-violet-700" },
  { id: "korean", label: "Korean", icon: "🇰🇷", color: "from-fuchsia-500 to-rose-600" },
];

// Real artist images from JioSaavn CDN (verified)
const ARTISTS_BY_LANGUAGE: Record<string, { name: string; avatar: string }[]> = {
  english: [
    { name: "Taylor Swift", avatar: "https://c.saavncdn.com/artists/Taylor_Swift_003_20200226074119_500x500.jpg" },
    { name: "The Weeknd", avatar: "https://c.saavncdn.com/artists/The_Weeknd_002_20241003071400_500x500.jpg" },
    { name: "Drake", avatar: "https://c.saavncdn.com/artists/Drake_006_20260520062317_500x500.jpg" },
    { name: "Billie Eilish", avatar: "https://c.saavncdn.com/artists/Billie_Eilish_20190211151539_500x500.jpg" },
    { name: "Bruno Mars", avatar: "https://c.saavncdn.com/artists/Bruno_Mars_003_20260324060413_500x500.jpg" },
    { name: "Ed Sheeran", avatar: "https://c.saavncdn.com/artists/Ed_Sheeran_002_20250625073038_500x500.jpg" },
    { name: "Coldplay", avatar: "https://c.saavncdn.com/artists/Coldplay_002_20241003070447_500x500.jpg" },
    { name: "Eminem", avatar: "https://c.saavncdn.com/artists/Eminem_003_20240403152835_500x500.jpg" },
    { name: "Ariana Grande", avatar: "https://c.saavncdn.com/artists/Ariana_Grande_007_20260616180049_500x500.jpg" },
    { name: "Justin Bieber", avatar: "https://c.saavncdn.com/artists/Justin_Bieber_005_20201127112218_500x500.jpg" },
    { name: "Post Malone", avatar: "https://c.saavncdn.com/artists/Post_Malone_004_20190911070147_500x500.jpg" },
    { name: "Dua Lipa", avatar: "https://c.saavncdn.com/artists/Dua_Lipa_004_20231120090922_500x500.jpg" },
  ],
  hindi: [
    { name: "Arijit Singh", avatar: "https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg" },
    { name: "A.R. Rahman", avatar: "https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg" },
    { name: "Pritam", avatar: "https://c.saavncdn.com/artists/Pritam_Chakraborty-20170711073326_500x500.jpg" },
    { name: "Badshah", avatar: "https://c.saavncdn.com/artists/Badshah_006_20241118064015_500x500.jpg" },
    { name: "Shreya Ghoshal", avatar: "https://c.saavncdn.com/artists/Shreya_Ghoshal_007_20241101074144_500x500.jpg" },
    { name: "Yo Yo Honey Singh", avatar: "https://c.saavncdn.com/artists/Yo_Yo_Honey_Singh_002_20221216102650_500x500.jpg" },
    { name: "Divine", avatar: "https://c.saavncdn.com/artists/DIVINE_006_20250911071442_500x500.jpg" },
    { name: "Jubin Nautiyal", avatar: "https://c.saavncdn.com/artists/Jubin_Nautiyal_003_20231130204020_500x500.jpg" },
    { name: "Amit Trivedi", avatar: "https://c.saavncdn.com/artists/Amit_Trivedi_007_20241118063149_500x500.jpg" },
    { name: "Sonu Nigam", avatar: "https://c.saavncdn.com/artists/Sonu_Nigam_500x500.jpg" },
  ],
  tamil: [
    { name: "Anirudh Ravichander", avatar: "https://c.saavncdn.com/artists/Anirudh_Ravichander_003_20260121134149_500x500.jpg" },
    { name: "A.R. Rahman", avatar: "https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg" },
    { name: "Yuvan Shankar Raja", avatar: "https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_002_20180802174245_500x500.jpg" },
    { name: "Sid Sriram", avatar: "https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg" },
    { name: "Santhosh Narayanan", avatar: "https://c.saavncdn.com/artists/Santhosh_Narayanan_002_20250527101718_500x500.jpg" },
    { name: "Harris Jayaraj", avatar: "https://c.saavncdn.com/artists/Harris_Jayaraj_002_20230718071330_500x500.jpg" },
    { name: "Ilaiyaraaja", avatar: "https://c.saavncdn.com/artists/Ilaiyaraaja_001_20251020081419_500x500.jpg" },
    { name: "G.V. Prakash Kumar", avatar: "https://c.saavncdn.com/artists/G_V__Prakash_Kumar_003_20251113063655_500x500.jpg" },
    { name: "Hiphop Tamizha", avatar: "https://c.saavncdn.com/artists/Hiphop_Tamizha_002_20230315131424_500x500.jpg" },
    { name: "Pradeep Kumar", avatar: "https://c.saavncdn.com/artists/Pradeep_Kumar_002_20250807084559_500x500.jpg" },
  ],
  telugu: [
    { name: "Devi Sri Prasad", avatar: "https://c.saavncdn.com/artists/Devi_Sri_Prasad_008_20250619062824_500x500.jpg" },
    { name: "Thaman S", avatar: "https://c.saavncdn.com/artists/Thaman_S__007_20231106094011_500x500.jpg" },
    { name: "M.M. Keeravani", avatar: "https://c.saavncdn.com/artists/M__M__Keeravani_002_20240129101710_500x500.jpg" },
    { name: "Sid Sriram", avatar: "https://c.saavncdn.com/artists/Sid_Sriram_005_20240425180600_500x500.jpg" },
    { name: "Anurag Kulkarni", avatar: "https://c.saavncdn.com/artists/Anurag_Kulkarni_004_20251029091123_500x500.jpg" },
    { name: "Armaan Malik", avatar: "https://c.saavncdn.com/artists/Armaan_Malik_005_20240819091627_500x500.jpg" },
    { name: "Karthik", avatar: "https://c.saavncdn.com/artists/Karthik_500x500.jpg" },
    { name: "Mani Sharma", avatar: "https://c.saavncdn.com/artists/Mani_Sharma_500x500.jpg" },
  ],
  punjabi: [
    { name: "Diljit Dosanjh", avatar: "https://c.saavncdn.com/artists/Diljit_Dosanjh_005_20231025073054_500x500.jpg" },
    { name: "Sidhu Moose Wala", avatar: "https://c.saavncdn.com/artists/Sidhu_Moose_Wala_004_20250617183705_500x500.jpg" },
    { name: "AP Dhillon", avatar: "https://c.saavncdn.com/artists/AP_Dhillon_004_20251023102150_500x500.jpg" },
    { name: "Karan Aujla", avatar: "https://c.saavncdn.com/artists/Karan_Aujla_003_20260218102828_500x500.jpg" },
    { name: "Guru Randhawa", avatar: "https://c.saavncdn.com/artists/Guru_Randhawa_004_20250701125845_500x500.jpg" },
    { name: "Ammy Virk", avatar: "https://c.saavncdn.com/artists/Ammy_Virk_005_20241101070506_500x500.jpg" },
    { name: "Harrdy Sandhu", avatar: "https://c.saavncdn.com/artists/Hardy_Sandhu_001_20190913112018_500x500.jpg" },
    { name: "B Praak", avatar: "https://c.saavncdn.com/artists/B_Praak_001_20191118112005_500x500.jpg" },
  ],
  spanish: [
    { name: "Bad Bunny", avatar: "https://c.saavncdn.com/artists/Bad_Bunny_001_20250207055513_500x500.jpg" },
    { name: "Shakira", avatar: "https://c.saavncdn.com/artists/Shakira_002_20220916145812_500x500.jpg" },
    { name: "J Balvin", avatar: "https://c.saavncdn.com/artists/J_Balvin_002_20200314080220_500x500.jpg" },
    { name: "Karol G", avatar: "https://c.saavncdn.com/artists/Karol_G_001_20250213055723_500x500.jpg" },
    { name: "Rosalía", avatar: "https://c.saavncdn.com/artists/Rosalia_001_20250213055740_500x500.jpg" },
    { name: "Maluma", avatar: "https://c.saavncdn.com/artists/Maluma_001_20250213055647_500x500.jpg" },
    { name: "Daddy Yankee", avatar: "https://c.saavncdn.com/artists/Daddy_Yankee_500x500.jpg" },
  ],
  korean: [
    { name: "BTS", avatar: "https://c.saavncdn.com/artists/BTS_006_20260624192553_500x500.jpg" },
    { name: "BLACKPINK", avatar: "https://c.saavncdn.com/artists/BlackPink_005_20260319191032_500x500.jpg" },
    { name: "NewJeans", avatar: "https://c.saavncdn.com/artists/NewJeans_001_20250213055831_500x500.jpg" },
    { name: "TWICE", avatar: "https://c.saavncdn.com/artists/Twice_20190506094329_500x500.jpg" },
    { name: "IU", avatar: "https://c.saavncdn.com/artists/IU_001_20250213060025_500x500.jpg" },
    { name: "Stray Kids", avatar: "https://c.saavncdn.com/artists/Stray_Kids_000_20230622105959_500x500.jpg" },
    { name: "aespa", avatar: "https://c.saavncdn.com/artists/aespa_001_20250213055904_500x500.jpg" },
    { name: "IVE", avatar: "https://c.saavncdn.com/artists/Ive_001_20260212182303_500x500.jpg" },
  ],
};

// Generate a deterministic color for an artist name (used as fallback)
function getArtistColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 35%)`;
}

export function PreferencesPicker() {
  const { selectedLanguages, selectedArtists, setPreferences, hasPickedPreferences } = usePreferencesStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [localLanguages, setLocalLanguages] = useState<string[]>([]);
  const [localArtists, setLocalArtists] = useState<string[]>([]);
  const [visible, setVisible] = useState(!hasPickedPreferences);

  if (!visible) return null;

  const toggleLanguage = (id: string) => {
    setLocalLanguages((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const toggleArtist = (name: string) => {
    setLocalArtists((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  const handleNextStep = () => {
    if (localLanguages.length === 0) return;
    setStep(2);
  };

  const handleConfirm = async () => {
    if (localArtists.length === 0) return;
    setPreferences(localLanguages, localArtists);
    setVisible(false);
    try {
      const { apiClient } = await import("@/shared/services/api-client");
      await apiClient.post("/user/preferences", {
        favouriteLanguages: localLanguages,
        favouriteArtists: localArtists,
      });
    } catch (err) {
      console.warn("Failed to sync preferences to backend database:", err);
    }
  };

  // Get union of artists based on selected languages
  const getAvailableArtists = () => {
    const list: { name: string; avatar: string }[] = [];
    const seen = new Set<string>();

    localLanguages.forEach((lang) => {
      const artists = ARTISTS_BY_LANGUAGE[lang] || [];
      artists.forEach((art) => {
        if (!seen.has(art.name)) {
          seen.add(art.name);
          list.push(art);
        }
      });
    });

    return list;
  };

  const availableArtists = getAvailableArtists();

  // Artist avatar with fallback to initials
  const ArtistAvatar = ({ name, avatar }: { name: string; avatar: string }) => {
    const [imgError, setImgError] = useState(false);
    const initials = name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    if (!imgError) {
      return (
        <img
          src={avatar}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      );
    }

    // Fallback: gradient circle with initials
    return (
      <div
        className="w-full h-full flex items-center justify-center text-white font-black text-sm"
        style={{ background: `linear-gradient(135deg, ${getArtistColor(name)}, ${getArtistColor(name + "x")})` }}
      >
        {initials}
      </div>
    );
  };

  if (!visible) return null;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (visible) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [visible]);

  const modalContent = (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 flex flex-col items-center p-4 sm:p-6 select-none overflow-y-auto overscroll-contain" style={{ backgroundColor: "rgba(11, 11, 15, 0.95)", backdropFilter: "blur(16px)", zIndex: 99999 }}>
          <motion.div
            key="preferences-picker"
            initial={{ scale: 0.9, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className="w-full max-w-[95vw] sm:max-w-2xl my-auto flex-shrink-0 py-8"
          >
            {step === 1 ? (
              /* Step 1: Language Picker */
              <div className="space-y-6 sm:space-y-8">
                <div className="text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#4cf479]/10 border border-[#4cf479]/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <span className="text-2xl sm:text-3xl">🗣️</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                    Select Your Languages
                  </h2>
                  <p className="text-white/50 text-xs sm:text-sm">
                    Tell us which languages you prefer to listen to.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {LANGUAGES.map((lang) => {
                    const isActive = localLanguages.includes(lang.id);
                    return (
                      <motion.button
                        key={lang.id}
                        onClick={() => toggleLanguage(lang.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border text-sm font-bold transition-all duration-200 ${
                          isActive
                            ? "border-[#4cf479] bg-[#4cf479]/10 text-[#4cf479]"
                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId={`active-lang-${lang.id}`}
                            className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${lang.color} opacity-10`}
                          />
                        )}
                        <span className="text-3xl">{lang.icon}</span>
                        <span className="relative z-10">{lang.label}</span>
                        {isActive && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#4cf479] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#003913] text-[10px] font-black">check</span>
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <motion.button
                    onClick={handleNextStep}
                    disabled={localLanguages.length === 0}
                    whileHover={localLanguages.length > 0 ? { scale: 1.03 } : {}}
                    whileTap={localLanguages.length > 0 ? { scale: 0.97 } : {}}
                    className={`w-full max-w-xs py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all ${
                      localLanguages.length > 0
                        ? "bg-[#4cf479] text-[#003913] neon-glow cursor-pointer"
                        : "bg-white/10 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    Next: Choose Artists &rarr;
                  </motion.button>
                </div>
              </div>
            ) : (
              /* Step 2: Artist Picker */
              <div className="space-y-6 sm:space-y-8">
                <div className="text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#4cf479]/10 border border-[#4cf479]/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <span className="text-2xl sm:text-3xl">🎤</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                    Who are your favorites?
                  </h2>
                  <p className="text-white/50 text-xs sm:text-sm">
                    Select artists you enjoy in your chosen languages.
                  </p>
                </div>

                <div className="max-h-[50vh] overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#4cf479 transparent" }}>
                  {availableArtists.map((artist) => {
                    const isActive = localArtists.includes(artist.name);
                    return (
                      <motion.button
                        key={artist.name}
                        onClick={() => toggleArtist(artist.name)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative flex flex-col items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-center transition-all duration-200 ${
                          isActive
                            ? "border-[#4cf479] bg-[#4cf479]/10 text-[#4cf479]"
                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden mb-3 relative border border-white/10 shadow-md bg-white/5">
                          <ArtistAvatar name={artist.name} avatar={artist.avatar} />
                        </div>
                        <span className="text-xs font-bold relative z-10 truncate w-full">{artist.name}</span>
                        {isActive && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#4cf479] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#003913] text-[10px] font-black">check</span>
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 max-w-[150px] py-4 border border-white/10 bg-white/5 rounded-2xl text-xs font-bold hover:bg-white/10 text-white transition-colors"
                  >
                    &larr; Back
                  </button>
                  <motion.button
                    onClick={handleConfirm}
                    disabled={localArtists.length === 0}
                    whileHover={localArtists.length > 0 ? { scale: 1.03 } : {}}
                    whileTap={localArtists.length > 0 ? { scale: 0.97 } : {}}
                    className={`flex-1 max-w-[250px] py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all ${
                      localArtists.length > 0
                        ? "bg-[#4cf479] text-[#003913] neon-glow cursor-pointer"
                        : "bg-white/10 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    Let&apos;s Play
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
export default PreferencesPicker;

