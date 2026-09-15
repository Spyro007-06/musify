import { Play, Pause, Heart, Clock } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import type { MusicItem } from '../../hooks/useMusic';

interface TrackRowProps {
  track: MusicItem;
  index: number;
  context?: MusicItem[];  // full tracklist for queue context
  showAlbum?: boolean;
}

export function TrackRow({ track, index, context, showAlbum = false }: TrackRowProps) {
  const { playTrack, currentTrack, isPlaying, toggleLike } = usePlayerStore();
  
  const isActive = currentTrack?.id === track.id;
  
  const artistName = track.artists?.map(a => a.name).join(', ') || track.artist?.name || 'Unknown';
  
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const decodeHtml = (html: string) => {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const handlePlay = () => {
    if (track.audioUrl) {
      playTrack(track, context);
    }
  };

  return (
    <div 
      className={`group grid grid-cols-[40px_4fr_2fr_minmax(60px,1fr)] gap-4 items-center px-4 py-2 rounded-lg transition-colors cursor-pointer ${
        isActive 
          ? 'bg-white/10 text-primary' 
          : 'hover:bg-white/5 text-foreground'
      }`}
      onDoubleClick={handlePlay}
    >
      {/* Track Number / Play Icon */}
      <div className="flex items-center justify-center w-8">
        <span className="text-sm text-text-secondary group-hover:hidden block tabular-nums">
          {isActive && isPlaying ? (
            <span className="inline-flex gap-[2px] items-end h-4">
              <span className="w-[3px] h-2 bg-primary animate-[bounce_0.6s_ease-in-out_infinite]" />
              <span className="w-[3px] h-3 bg-primary animate-[bounce_0.6s_ease-in-out_infinite_0.15s]" />
              <span className="w-[3px] h-[6px] bg-primary animate-[bounce_0.6s_ease-in-out_infinite_0.3s]" />
            </span>
          ) : (
            index + 1
          )}
        </span>
        <button 
          onClick={handlePlay}
          className="hidden group-hover:flex items-center justify-center text-foreground hover:text-primary transition-colors"
        >
          {isActive && isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </button>
      </div>

      {/* Track Info */}
      <div className="flex items-center gap-3 min-w-0">
        {track.artwork && (
          <img 
            src={track.artwork.replace(/50x50|150x150/g, '500x500')} 
            alt="" 
            className="w-10 h-10 rounded object-cover shrink-0"
            loading="lazy"
          />
        )}
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
            {decodeHtml(track.title)}
          </p>
          <p className="text-xs text-text-secondary truncate">
            {decodeHtml(artistName)}
          </p>
        </div>
      </div>

      {/* Album */}
      <div className="text-sm text-text-secondary truncate hidden md:block">
        {showAlbum && track.album ? decodeHtml(track.album.title) : ''}
      </div>

      {/* Duration & Actions */}
      <div className="flex items-center justify-end gap-3">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleLike(track.id); }}
          className={`opacity-0 group-hover:opacity-100 transition-opacity ${track.isLiked ? 'text-red-500 opacity-100' : 'text-text-secondary hover:text-foreground'}`}
        >
          <Heart className={`w-4 h-4 ${track.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
        <span className="text-sm text-text-secondary tabular-nums">
          {formatDuration(track.duration)}
        </span>
      </div>
    </div>
  );
}

// Header row for tracklist columns
export function TrackListHeader() {
  return (
    <div className="grid grid-cols-[40px_4fr_2fr_minmax(60px,1fr)] gap-4 items-center px-4 py-2 border-b border-border/30 text-text-secondary text-xs uppercase tracking-wider mb-2">
      <div className="text-center">#</div>
      <div>Title</div>
      <div className="hidden md:block">Album</div>
      <div className="flex justify-end"><Clock className="w-4 h-4" /></div>
    </div>
  );
}
