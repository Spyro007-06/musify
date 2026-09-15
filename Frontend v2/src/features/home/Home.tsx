import { motion } from 'framer-motion';
import { useNewReleases, useTrendingMusic, useAlbums, useCategories, useRecommended } from '../../hooks/useMusic';
import { usePlayerStore } from '../../store/usePlayerStore';
import { SectionHeader } from '../../components/music/SectionHeader';
import { AlbumCarousel } from '../../components/music/AlbumCarousel';
import { AlbumCard } from '../../components/music/AlbumCard';
import { Loader2, Play, Pause, Heart, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const { data: trending, isLoading: trendingLoading } = useTrendingMusic();
  const { data: newReleases, isLoading: newReleasesLoading } = useNewReleases();
  const { data: albums, isLoading: albumsLoading } = useAlbums(1);
  const { data: categories } = useCategories();
  const { data: recommended } = useRecommended();

  const { playTrack, currentTrack, isPlaying, toggleLike } = usePlayerStore();

  if (trendingLoading || newReleasesLoading || albumsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const featuredTrack = trending?.[0];
  const quickPlayTracks = trending?.slice(1, 7) || [];

  const isFeaturedPlaying = currentTrack?.id === featuredTrack?.id && isPlaying;

  const handlePlayTrack = (track: any, context: any[]) => {
    if (track.audioUrl) {
      playTrack(track, context);
    }
  };

  const decodeHtml = (html: string) => {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } }
  };

  return (
    <motion.div 
      className="flex flex-col pb-28 pt-2 overflow-x-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Time-based Greeting & Subtitle */}
      <motion.div variants={itemVariants} className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-foreground tracking-tight flex items-center gap-2">
            {getGreeting()}
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            >
              👋
            </motion.span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">Welcome back to your ultimate sonic sanctuary.</p>
        </div>
      </motion.div>

      {/* Redesigned Hero and Quick Play Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
        {/* Immersive Featured Track Banner */}
        {featuredTrack && (
          <div className="lg:col-span-3 relative rounded-2xl overflow-hidden glass-panel flex flex-col justify-end p-6 min-h-[300px] md:min-h-[340px] group shadow-2xl">
            {/* Dynamic cover backdrop */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 transition-transform duration-1000 group-hover:scale-105 pointer-events-none"
              style={{ backgroundImage: `url(${featuredTrack.artwork?.replace(/50x50|150x150/g, '500x500')})` }}
            />
            {/* Radial overlay for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none z-0" />
            
            {/* Top Badge */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md z-10">
              <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Featured Track</span>
            </div>

            {/* Content info */}
            <div className="relative z-10 flex flex-col md:flex-row items-end justify-between gap-4">
              <div className="flex gap-4 items-center min-w-0">
                <div className="min-w-0 flex flex-col">
                  <h2 className="text-xl md:text-3xl font-heading font-black text-foreground truncate drop-shadow-md">
                    {decodeHtml(featuredTrack.title)}
                  </h2>
                  <p className="text-sm md:text-base text-text-secondary truncate mt-1">
                    {decodeHtml(featuredTrack.artists?.map(a => a.name).join(', ') || featuredTrack.artist?.name || 'Unknown Artist')}
                  </p>
                  <p className="text-xs text-primary font-medium mt-1">#1 Trending Track</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <button 
                  onClick={() => handlePlayTrack(featuredTrack, trending || [])}
                  className="flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-foreground text-background font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  {isFeaturedPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                      <span>Play Now</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => toggleLike(featuredTrack.id)}
                  className={`flex items-center justify-center w-12 h-12 rounded-full border backdrop-blur-md transition-all ${
                    featuredTrack.isLiked 
                      ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                      : 'border-white/15 hover:border-foreground text-foreground hover:bg-white/5'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${featuredTrack.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Play Grid */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <h3 className="text-base font-bold text-foreground mb-3 uppercase tracking-wider text-muted px-1">Quick Play</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 h-full">
            {quickPlayTracks.map((track) => {
              const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <div 
                  key={track.id}
                  onClick={() => handlePlayTrack(track, trending || [])}
                  className={`flex items-center justify-between p-2 rounded-xl bg-surface/30 hover:bg-surface/50 border border-white/5 cursor-pointer group transition-all duration-300 ${
                    currentTrack?.id === track.id ? 'ring-1 ring-primary bg-surface/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={track.artwork?.replace(/50x50|150x150/g, '500x500')} 
                      alt="" 
                      className="w-11 h-11 rounded-lg object-cover shadow shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${currentTrack?.id === track.id ? 'text-primary' : 'text-foreground'}`}>
                        {decodeHtml(track.title)}
                      </p>
                      <p className="text-[10px] text-text-secondary truncate mt-0.5">
                        {decodeHtml(track.artists?.map(a => a.name).join(', ') || track.artist?.name || 'Unknown')}
                      </p>
                    </div>
                  </div>

                  <button 
                    className={`mr-2 w-7 h-7 rounded-full flex items-center justify-center transition-all bg-primary/20 text-primary ${
                      isCurrentPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {isCurrentPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Browse Categories */}
      {categories && categories.length > 0 && (
        <motion.div variants={itemVariants} className="mb-10">
          <SectionHeader title="Explore Genres" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {categories.map(cat => (
              <div
                key={cat.id}
                onClick={() => navigate(`/search?q=${cat.id}`)}
                className={`relative h-20 rounded-xl overflow-hidden cursor-pointer group bg-gradient-to-r ${cat.gradient} shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5`}
              >
                <img
                  src={cat.cover}
                  alt={cat.name}
                  className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-50 group-hover:opacity-70 group-hover:scale-110 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute inset-0 flex items-center p-4">
                  <h3 className="text-sm font-extrabold text-white tracking-wide">{cat.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Trending Now Carousel */}
      <motion.div variants={itemVariants} className="mb-10">
        <SectionHeader title="Trending Now" href="/search?q=trending" />
        <AlbumCarousel>
          {trending?.map((item) => (
            <AlbumCard key={item.id} item={item} />
          ))}
        </AlbumCarousel>
      </motion.div>

      {/* New Releases Carousel */}
      <motion.div variants={itemVariants} className="mb-10">
        <SectionHeader title="New Releases" href="/search?q=new releases" />
        <AlbumCarousel>
          {newReleases?.map((item) => (
            <AlbumCard 
              key={item.id} 
              item={item} 
              onClick={() => navigate(`/album/${item.id}`)}
            />
          ))}
        </AlbumCarousel>
      </motion.div>

      {/* Made For You (Recommended) */}
      {recommended && recommended.length > 0 && (
        <motion.div variants={itemVariants} className="mb-10">
          <SectionHeader title="Made for You" />
          <AlbumCarousel>
            {recommended.map((item) => (
              <AlbumCard key={item.id} item={item} />
            ))}
          </AlbumCarousel>
        </motion.div>
      )}

      {/* Top Albums Carousel */}
      <motion.div variants={itemVariants}>
        <SectionHeader title="Top Albums" href="/search?q=top albums" />
        <AlbumCarousel>
          {albums?.map((item) => (
            <AlbumCard 
              key={item.id} 
              item={item}
              onClick={() => navigate(`/album/${item.id}`)}
            />
          ))}
        </AlbumCarousel>
      </motion.div>
    </motion.div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

