import { useParams, useNavigate } from 'react-router-dom';
import { usePlaylistDetail } from '../../hooks/usePlaylists';
import { usePlayerStore } from '../../store/usePlayerStore';
import { TrackRow, TrackListHeader } from '../../components/music/TrackRow';
import { Loader2, Play, Pause, ArrowLeft, Music } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: playlist, isLoading } = usePlaylistDetail(id || '');
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayerStore();

  if (isLoading || !playlist) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tracks = playlist.tracks || [];
  const isCurrentPlaylistPlaying = tracks.some(t => t.id === currentTrack?.id) && isPlaying;

  const handlePlayAll = () => {
    const playable = tracks.filter(t => t.audioUrl);
    if (playable.length > 0) {
      if (isCurrentPlaylistPlaying) {
        togglePlayPause();
      } else {
        playTrack(playable[0], playable);
      }
    }
  };

  return (
    <motion.div
      className="flex flex-col pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary hover:text-foreground transition-colors mb-4 px-2">
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm">Back</span>
      </button>

      {/* Hero */}
      <div className="flex flex-col md:flex-row items-end gap-6 mb-8 px-2">
        <div className="w-[220px] h-[220px] rounded-xl overflow-hidden shadow-2xl shrink-0 bg-gradient-to-br from-primary/30 to-highlight/30 flex items-center justify-center">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <Music className="w-20 h-20 text-primary/50" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-text-secondary font-medium">Playlist</span>
          <h1 className="text-3xl md:text-5xl font-heading font-bold text-foreground leading-tight">
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className="text-sm text-text-secondary max-w-lg">{playlist.description}</p>
          )}
          <p className="text-sm text-text-secondary">{tracks.length} songs</p>
        </div>
      </div>

      {/* Play Controls */}
      <div className="flex items-center gap-6 mb-6 px-2">
        <button
          onClick={handlePlayAll}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
        >
          {isCurrentPlaylistPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
        </button>
      </div>

      {/* Track List */}
      {tracks.length > 0 ? (
        <div className="px-2">
          <TrackListHeader />
          {tracks.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} context={tracks} showAlbum />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Music className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">This playlist is empty</p>
          <p className="text-sm mt-1">Search for songs to add</p>
        </div>
      )}
    </motion.div>
  );
}
