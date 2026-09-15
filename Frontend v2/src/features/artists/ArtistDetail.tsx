import { useParams, useNavigate } from 'react-router-dom';
import { useArtist, useArtistTopTracks, useArtistAlbums, useRelatedArtists } from '../../hooks/useArtist';
import { usePlayerStore } from '../../store/usePlayerStore';
import { TrackRow, TrackListHeader } from '../../components/music/TrackRow';
import { AlbumCard } from '../../components/music/AlbumCard';
import { AlbumCarousel } from '../../components/music/AlbumCarousel';
import { SectionHeader } from '../../components/music/SectionHeader';
import { Loader2, Play, ArrowLeft, UserCheck, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: artist, isLoading: artistLoading } = useArtist(id || '');
  const { data: topTracks } = useArtistTopTracks(id || '');
  const { data: albums } = useArtistAlbums(id || '');
  const { data: related } = useRelatedArtists(id || '');
  const { playTrack } = usePlayerStore();
  const [showAll, setShowAll] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  if (artistLoading || !artist) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const imageUrl = artist.image?.replace(/50x50|150x150/g, '500x500') 
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=random&size=500`;
  
  const displayedTracks = showAll ? topTracks : topTracks?.slice(0, 5);

  const handlePlayAll = () => {
    if (topTracks && topTracks.length > 0) {
      const playable = topTracks.filter(t => t.audioUrl);
      if (playable.length > 0) playTrack(playable[0], playable);
    }
  };

  const formatFollowers = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <motion.div
      className="flex flex-col pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary hover:text-foreground transition-colors mb-4 px-2">
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm">Back</span>
      </button>

      {/* Hero */}
      <div className="relative mb-8 px-2">
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="w-[200px] h-[200px] rounded-full overflow-hidden shadow-2xl shrink-0 ring-4 ring-primary/20">
            <img src={imageUrl} alt={artist.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-text-secondary font-medium flex items-center gap-1">
              {artist.isVerified && <span className="text-primary">✓</span>} Artist
            </span>
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-foreground leading-tight">
              {artist.name}
            </h1>
            <p className="text-sm text-text-secondary">
              {formatFollowers(artist.followers)} followers
              {artist.genres.length > 0 && ` • ${artist.genres.join(', ')}`}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 mb-8 px-2">
        <button
          onClick={handlePlayAll}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
        >
          <Play className="w-6 h-6 fill-current ml-1" />
        </button>
        <button
          onClick={() => setIsFollowing(!isFollowing)}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold border transition-all ${
            isFollowing 
              ? 'border-primary text-primary hover:border-red-400 hover:text-red-400' 
              : 'border-border text-foreground hover:border-foreground'
          }`}
        >
          {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
        </button>
      </div>

      {/* Popular Tracks */}
      {topTracks && topTracks.length > 0 && (
        <section className="mb-8 px-2">
          <h2 className="text-xl font-heading font-bold text-foreground mb-4">Popular</h2>
          <TrackListHeader />
          {displayedTracks?.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} context={topTracks} showAlbum />
          ))}
          {topTracks.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 text-sm text-text-secondary hover:text-foreground transition-colors font-medium"
            >
              {showAll ? 'Show less' : 'See more'}
            </button>
          )}
        </section>
      )}

      {/* Discography */}
      {albums && albums.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Discography" />
          <AlbumCarousel>
            {albums.map(album => (
              <AlbumCard
                key={album.id}
                item={{ id: album.id, title: album.title, artwork: album.artwork, artist: album.artist }}
                onClick={() => navigate(`/album/${album.id}`)}
              />
            ))}
          </AlbumCarousel>
        </section>
      )}

      {/* Related Artists */}
      {related && related.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Fans also like" />
          <AlbumCarousel>
            {related.map(r => (
              <div
                key={r.id}
                onClick={() => navigate(`/artist/${r.id}`)}
                className="group flex flex-col items-center space-y-3 cursor-pointer w-[180px] shrink-0"
              >
                <div className="w-[160px] h-[160px] rounded-full overflow-hidden bg-surface/50 shadow-lg group-hover:shadow-primary/20 transition-shadow">
                  <img
                    src={r.image?.replace(/50x50|150x150/g, '500x500') || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=random&size=500&rounded=true`}
                    alt={r.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm font-medium text-foreground truncate text-center w-full">{r.name}</p>
                <p className="text-xs text-text-secondary">Artist</p>
              </div>
            ))}
          </AlbumCarousel>
        </section>
      )}
    </motion.div>
  );
}
