import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Check, ChevronRight, ChevronLeft, Music } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { apiClient } from '../../lib/apiClient';

interface Language {
  id: string;
  name: string;
  native: string;
  gradient: string;
  character: string;
}

interface Artist {
  name: string;
  image: string;
}

const LANGUAGES: Language[] = [
  { id: 'english', name: 'English', native: 'English', character: 'En', gradient: 'from-slate-500/20 to-zinc-500/20' },
  { id: 'hindi', name: 'Hindi', native: 'हिन्दी', character: 'हि', gradient: 'from-rose-500/20 to-orange-500/20' },
  { id: 'punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', character: 'ਪੰ', gradient: 'from-amber-500/20 to-yellow-500/20' },
  { id: 'tamil', name: 'Tamil', native: 'தமிழ்', character: 'த', gradient: 'from-emerald-500/20 to-teal-500/20' },
  { id: 'telugu', name: 'Telugu', native: 'తెలుగు', character: 'తె', gradient: 'from-blue-500/20 to-indigo-500/20' },
  { id: 'malayalam', name: 'Malayalam', native: 'മലയാളം', character: 'മ', gradient: 'from-violet-500/20 to-purple-500/20' },
  { id: 'kannada', name: 'Kannada', native: 'ಕನ್ನಡ', character: 'ಕ', gradient: 'from-fuchsia-500/20 to-pink-500/20' },
  { id: 'bengali', name: 'Bengali', native: 'বাংলা', character: 'বা', gradient: 'from-cyan-500/20 to-sky-500/20' },
  { id: 'marathi', name: 'Marathi', native: 'मराठी', character: 'म', gradient: 'from-lime-500/20 to-green-500/20' },
  { id: 'gujarati', name: 'Gujarati', native: 'ગુજરાતી', character: 'ગુ', gradient: 'from-red-500/20 to-pink-500/20' },
];

const LANGUAGE_ARTISTS: Record<string, Artist[]> = {
  hindi: [
    { name: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_002_20200522115124_150x150.jpg' },
    { name: 'Shreya Ghoshal', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_150x150.jpg' },
    { name: 'Pritam', image: 'https://c.saavncdn.com/artists/Pritam_150x150.jpg' },
    { name: 'Neha Kakkar', image: 'https://c.saavncdn.com/artists/Neha_Kakkar_150x150.jpg' },
    { name: 'Badshah', image: 'https://c.saavncdn.com/artists/Badshah_150x150.jpg' },
    { name: 'A. R. Rahman', image: 'https://c.saavncdn.com/artists/A_R_Rahman_150x150.jpg' },
    { name: 'Jubin Nautiyal', image: 'https://c.saavncdn.com/artists/Jubin_Nautiyal_005_20201127113111_150x150.jpg' },
    { name: 'Anuv Jain', image: 'https://c.saavncdn.com/artists/Anuv_Jain_150x150.jpg' }
  ],
  punjabi: [
    { name: 'Diljit Dosanjh', image: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_150x150.jpg' },
    { name: 'Sidhu Moose Wala', image: 'https://c.saavncdn.com/artists/Sidhu_Moose_Wala_150x150.jpg' },
    { name: 'AP Dhillon', image: 'https://c.saavncdn.com/artists/AP_Dhillon_150x150.jpg' },
    { name: 'Karan Aujla', image: 'https://c.saavncdn.com/artists/Karan_Aujla_150x150.jpg' },
    { name: 'Guru Randhawa', image: 'https://c.saavncdn.com/artists/Guru_Randhawa_150x150.jpg' },
    { name: 'Shubh', image: 'https://c.saavncdn.com/artists/Shubh_150x150.jpg' }
  ],
  tamil: [
    { name: 'Anirudh Ravichander', image: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_150x150.jpg' },
    { name: 'A. R. Rahman', image: 'https://c.saavncdn.com/artists/A_R_Rahman_150x150.jpg' },
    { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_150x150.jpg' },
    { name: 'Yuvan Shankar Raja', image: 'https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_150x150.jpg' },
    { name: 'Harris Jayaraj', image: 'https://c.saavncdn.com/artists/Harris_Jayaraj_150x150.jpg' },
    { name: 'G. V. Prakash Kumar', image: 'https://c.saavncdn.com/artists/G_V_Prakash_Kumar_150x150.jpg' }
  ],
  telugu: [
    { name: 'Devi Sri Prasad', image: 'https://c.saavncdn.com/artists/Devi_Sri_Prasad_150x150.jpg' },
    { name: 'Sid Sriram', image: 'https://c.saavncdn.com/artists/Sid_Sriram_150x150.jpg' },
    { name: 'M. M. Keeravani', image: 'https://c.saavncdn.com/artists/M_M_Keeravani_150x150.jpg' },
    { name: 'S. Thaman', image: 'https://c.saavncdn.com/artists/S_Thaman_150x150.jpg' },
    { name: 'Karthik', image: 'https://c.saavncdn.com/artists/Karthik_150x150.jpg' },
    { name: 'Anurag Kulkarni', image: 'https://c.saavncdn.com/artists/Anurag_Kulkarni_150x150.jpg' }
  ],
  malayalam: [
    { name: 'Sushin Shyam', image: 'https://c.saavncdn.com/artists/Sushin_Shyam_150x150.jpg' },
    { name: 'K. S. Harisankar', image: 'https://c.saavncdn.com/artists/K_S_Harisankar_150x150.jpg' },
    { name: 'Gopi Sundar', image: 'https://c.saavncdn.com/artists/Gopi_Sundar_150x150.jpg' },
    { name: 'Vineeth Sreenivasan', image: 'https://c.saavncdn.com/artists/Vineeth_Sreenivasan_150x150.jpg' },
    { name: 'Jakes Bejoy', image: 'https://c.saavncdn.com/artists/Jakes_Bejoy_150x150.jpg' }
  ],
  kannada: [
    { name: 'Arjun Janya', image: 'https://c.saavncdn.com/artists/Arjun_Janya_150x150.jpg' },
    { name: 'Sanjith Hegde', image: 'https://c.saavncdn.com/artists/Sanjith_Hegde_150x150.jpg' },
    { name: 'Vijay Prakash', image: 'https://c.saavncdn.com/artists/Vijay_Prakash_150x150.jpg' },
    { name: 'Ravi Basrur', image: 'https://c.saavncdn.com/artists/Ravi_Basrur_150x150.jpg' }
  ],
  bengali: [
    { name: 'Anupam Roy', image: 'https://c.saavncdn.com/artists/Anupam_Roy_150x150.jpg' },
    { name: 'Arijit Singh', image: 'https://c.saavncdn.com/artists/Arijit_Singh_002_20200522115124_150x150.jpg' },
    { name: 'Jeet Gannguli', image: 'https://c.saavncdn.com/artists/Jeet_Gannguli_150x150.jpg' },
    { name: 'Shreya Ghoshal', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_150x150.jpg' },
    { name: 'Rupam Islam', image: 'https://c.saavncdn.com/artists/Rupam_Islam_150x150.jpg' }
  ],
  marathi: [
    { name: 'Ajay-Atul', image: 'https://c.saavncdn.com/artists/Ajay_Atul_150x150.jpg' },
    { name: 'Shreya Ghoshal', image: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_150x150.jpg' },
    { name: 'Adarsh Shinde', image: 'https://c.saavncdn.com/artists/Adarsh_Shinde_150x150.jpg' },
    { name: 'Abhay Jodhpurkar', image: 'https://c.saavncdn.com/artists/Abhay_Jodhpurkar_150x150.jpg' }
  ],
  gujarati: [
    { name: 'Sachin-Jigar', image: 'https://c.saavncdn.com/artists/Sachin_Jigar_150x150.jpg' },
    { name: 'Kinjal Dave', image: 'https://c.saavncdn.com/artists/Kinjal_Dave_150x150.jpg' },
    { name: 'Geeta Rabari', image: 'https://c.saavncdn.com/artists/Geeta_Rabari_150x150.jpg' },
    { name: 'Jigaradan Gadhavi', image: 'https://c.saavncdn.com/artists/Jigaradan_Gadhavi_150x150.jpg' }
  ],
  english: [
    { name: 'The Weeknd', image: 'https://c.saavncdn.com/artists/The_Weeknd_150x150.jpg' },
    { name: 'Taylor Swift', image: 'https://c.saavncdn.com/artists/Taylor_Swift_150x150.jpg' },
    { name: 'Justin Bieber', image: 'https://c.saavncdn.com/artists/Justin_Bieber_150x150.jpg' },
    { name: 'Ed Sheeran', image: 'https://c.saavncdn.com/artists/Ed_Sheeran_150x150.jpg' },
    { name: 'Dua Lipa', image: 'https://c.saavncdn.com/artists/Dua_Lipa_150x150.jpg' },
    { name: 'Billie Eilish', image: 'https://c.saavncdn.com/artists/Billie_Eilish_150x150.jpg' },
    { name: 'Drake', image: 'https://c.saavncdn.com/artists/Drake_150x150.jpg' },
    { name: 'Bruno Mars', image: 'https://c.saavncdn.com/artists/Bruno_Mars_150x150.jpg' }
  ]
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [artistImages, setArtistImages] = useState<Record<string, string>>({});
  const fetchedArtistsRef = useRef<Set<string>>(new Set());

  // Load existing preferences if editing
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await apiClient.get('/user/preferences');
        const prefs = response.data.data;
        if (prefs) {
          if (prefs.favouriteLanguages) {
            setSelectedLangs(prefs.favouriteLanguages);
          }
          if (prefs.favouriteArtists) {
            setSelectedArtists(prefs.favouriteArtists);
          }
        }
      } catch (err) {
        console.error('Failed to load existing preferences:', err);
      }
    };
    loadPreferences();
  }, []);

  const toggleLanguage = (langId: string) => {
    setSelectedLangs(prev => 
      prev.includes(langId) ? prev.filter(id => id !== langId) : [...prev, langId]
    );
  };

  const toggleArtist = (artistName: string) => {
    setSelectedArtists(prev => 
      prev.includes(artistName) ? prev.filter(name => name !== artistName) : [...prev, artistName]
    );
  };

  // Get combined artists for all chosen languages (Memoized to prevent infinite renders)
  const availableArtists = useMemo(() => {
    const combined: Artist[] = [];
    const seen = new Set<string>();

    selectedLangs.forEach(langId => {
      const list = LANGUAGE_ARTISTS[langId] || [];
      list.forEach(artist => {
        if (!seen.has(artist.name)) {
          seen.add(artist.name);
          combined.push(artist);
        }
      });
    });

    return combined;
  }, [selectedLangs]);

  // Dynamically fetch accurate, up-to-date artist images when on Step 2
  useEffect(() => {
    if (step !== 2) return;

    let active = true;
    const fetchArtistImages = async () => {
      // Find which artists don't have images loaded yet and aren't currently being fetched
      const toFetch = availableArtists.filter(
        artist => !artistImages[artist.name] && !fetchedArtistsRef.current.has(artist.name)
      );
      if (toFetch.length === 0) return;

      // Mark them as in-flight
      toFetch.forEach(artist => fetchedArtistsRef.current.add(artist.name));

      // Fetch in parallel
      await Promise.all(
        toFetch.map(async (artist) => {
          try {
            const res = await apiClient.get(`/search?q=${encodeURIComponent(artist.name)}`);
            const firstArtist = res.data.data?.artists?.[0];
            if (active && firstArtist && firstArtist.image && firstArtist.image !== 'https://www.jiosaavn.com/_i/3.0/artist-default-music.png') {
              setArtistImages(prev => ({
                ...prev,
                [artist.name]: firstArtist.image
              }));
            }
          } catch (err) {
            console.warn(`Failed to fetch image for artist "${artist.name}":`, err);
          }
        })
      );
    };

    fetchArtistImages();

    return () => {
      active = false;
    };
  }, [step, availableArtists]);

  const handleNextStep = () => {
    if (selectedLangs.length === 0) {
      toast.warning('Please select at least one language to proceed.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (selectedArtists.length === 0) {
      toast.warning('Please select at least one artist.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/user/preferences', {
        favouriteLanguages: selectedLangs,
        favouriteArtists: selectedArtists,
        favouriteGenres: selectedLangs, // align genres with chosen languages
      });

      toast.success('Your preferences have been saved!');
      if (window.location.search.includes('edit=true')) {
        navigate('/profile', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0B0B0C] px-4 md:px-6 py-12">
      {/* Aurora Cyberpunk BG */}
      <div className="absolute inset-0 aurora-bg opacity-70" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-[#0B0B0C]/80" />

      {/* Main glass panel card */}
      <div className="relative z-10 w-full max-w-3xl glass-panel rounded-3xl p-6 md:p-10 border border-white/5 shadow-2xl flex flex-col justify-between min-h-[550px]">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

        {/* Step Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              Musify Onboarding
            </span>
          </div>
          <div className="flex gap-1.5">
            <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step === 1 ? 'bg-primary shadow-[0_0_8px_var(--color-primary)]' : 'bg-white/10'}`} />
            <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step === 2 ? 'bg-primary shadow-[0_0_8px_var(--color-primary)]' : 'bg-white/10'}`} />
          </div>
        </div>

        {/* Animate Step Content */}
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col justify-between"
              >
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    What languages do you listen to?
                  </h1>
                  <p className="text-text-secondary text-sm mt-2 mb-6">
                    Select your languages. Your music recommendations will prioritize these selections.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 overflow-y-auto max-h-[320px] pr-2">
                    {LANGUAGES.map(lang => {
                      const isSelected = selectedLangs.includes(lang.id);
                      return (
                        <button
                          key={lang.id}
                          onClick={() => toggleLanguage(lang.id)}
                          className={`relative group rounded-2xl p-4 border text-left flex flex-col justify-between aspect-[1.3] transition-all duration-300 overflow-hidden cursor-pointer ${
                            isSelected 
                              ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(197,155,155,0.2)]'
                              : 'bg-white/3 border-white/5 hover:border-white/20 hover:bg-white/5 hover:translate-y-[-2px]'
                          }`}
                        >
                          {/* Native script character glowing in background */}
                          <div className={`absolute top-0 right-[-10px] text-5xl font-extrabold text-white/[0.03] select-none transition-all duration-500 group-hover:scale-110 ${
                            isSelected ? 'text-primary/[0.08]' : ''
                          }`}>
                            {lang.character}
                          </div>

                          <div className="flex justify-between items-start w-full">
                            <span className="text-xs font-bold text-text-secondary group-hover:text-foreground transition-colors">
                              {lang.native}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-background shadow-md shadow-primary/20">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          
                          <span className="text-base font-bold text-foreground mt-2 block">
                            {lang.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={handleNextStep}
                    disabled={selectedLangs.length === 0}
                    className="flex items-center gap-2 font-bold px-6 shadow-lg shadow-primary/20"
                    size="lg"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col justify-between"
              >
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    Who are your favorite artists?
                  </h1>
                  <p className="text-text-secondary text-sm mt-2 mb-6">
                    Choose the artists you love to personalize your home feed.
                  </p>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 overflow-y-auto max-h-[300px] pr-2">
                    {availableArtists.map(artist => {
                      const isSelected = selectedArtists.includes(artist.name);
                      return (
                        <button
                          key={artist.name}
                          onClick={() => toggleArtist(artist.name)}
                          className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
                        >
                          <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden transition-all duration-300 border-2 ${
                            isSelected 
                              ? 'border-primary shadow-[0_0_15px_rgba(197,155,155,0.4)] scale-95' 
                              : 'border-white/5 group-hover:border-white/20 group-hover:scale-105 shadow-md shadow-black/30'
                          }`}>
                            <img
                              src={artistImages[artist.name] || artist.image}
                              alt={artist.name}
                              className="w-full h-full object-cover transition-opacity duration-300"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-background border border-background shadow-md">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              </div>
                            )}
                          </div>
                          <span className={`text-[11px] md:text-xs font-semibold text-center mt-1 truncate w-full px-1 transition-colors ${
                            isSelected ? 'text-primary' : 'text-text-secondary group-hover:text-foreground'
                          }`}>
                            {artist.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 flex justify-between items-center">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <Button
                    onClick={handleSubmit}
                    isLoading={isSubmitting}
                    disabled={selectedArtists.length === 0}
                    className="flex items-center gap-2 font-bold px-6 shadow-lg shadow-primary/20"
                    size="lg"
                  >
                    <span>Finish</span>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
