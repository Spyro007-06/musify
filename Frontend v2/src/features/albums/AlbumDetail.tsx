import { useParams, useNavigate } from 'react-router-dom';
import { useAlbumDetail } from '../../hooks/useMusic';
import { usePlayerStore } from '../../store/usePlayerStore';
import { TrackRow, TrackListHeader } from '../../components/music/TrackRow';
import { Loader2, Play, Pause, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: album, isLoading } = useAlbumDetail(id || '');
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayerStore();

  if (isLoading || !album) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const imageUrl = (album.artwork || '').replace(/50x50|150x150/g, '500x500');
  const isCurrentAlbumPlaying = album.tracks.some(t => t.id === currentTrack?.id) && isPlaying;

  const handlePlayAll = () => {
    const playable = album.tracks.filter(t => t.audioUrl);
    if (playable.length > 0) {
      if (isCurrentAlbumPlaying) {
        togglePlayPause();
      } else {
        playTrack(playable[0], playable);
      }
    }
  };

  const decodeHtml = (html: string) => {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const totalDuration = album.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const formatTotalDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h} hr ${m} min` : `${m} min`;
  };

  return (
    <motion.div
      className="flex flex-col pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary hover:text-foreground transition-colors mb-4 px-2">
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm">Back</span>
      </button>

      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-end gap-6 mb-8 px-2">
        <div className="w-[220px] h-[220px] rounded-xl overflow-hidden shadow-2xl shrink-0">
          <img src={imageUrl} alt={album.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-text-secondary font-medium">Album</span>
          <h1 className="text-3xl md:text-5xl font-heading font-bold text-foreground leading-tight">
            {decodeHtml(album.title)}
          </h1>
          <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
            <span 
              className="font-medium text-foreground hover:underline cursor-pointer"
              onClick={() => album.artist?.id && navigate(`/artist/${album.artist.id}`)}
            >
              {decodeHtml(album.artist?.name || 'Various Artists')}
            </span>
            {album.releaseYear && <span>• {album.releaseYear}</span>}
            <span>• {album.tracksCount || album.tracks.length} songs</span>
            <span>• {formatTotalDuration(totalDuration)}</span>
          </div>
        </div>
      </div>

      {/* Play Controls */}
      <div className="flex items-center gap-6 mb-6 px-2">
        <button
          onClick={handlePlayAll}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
        >
          {isCurrentAlbumPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
        </button>
      </div>

      {/* Track List */}
      <div className="px-2">
        <TrackListHeader />
        {album.tracks.map((track, i) => (
          <TrackRow key={track.id} track={track} index={i} context={album.tracks} showAlbum={false} />
        ))}
      </div>
    </motion.div>
  );
}
