import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MusicItem } from '../../hooks/useMusic';
import { twMerge } from 'tailwind-merge';
import { usePlayerStore } from '../../store/usePlayerStore';

interface AlbumCardProps {
  item: MusicItem;
  className?: string;
  onClick?: () => void;
}

export function AlbumCard({ item, className, onClick }: AlbumCardProps) {
  const { playTrack, currentTrack, isPlaying } = usePlayerStore();
  
  // Use the new artwork field from the API, fallback to a cool gradient placeholder if missing
  let imageUrl = item.artwork || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=random&size=500`;
  
  // JioSaavn often returns 50x50 or 150x150 images which look blurry. We force the 500x500 high-res version.
  imageUrl = imageUrl.replace(/50x50|150x150/g, '500x500');
  
  // Format subtitle (Artist name or Album title)
  const subtitle = item.artists && item.artists.length > 0 
    ? item.artists.map(a => a.name).join(', ')
    : item.artist?.name || item.album?.title || 'Unknown';

  const isCurrentTrack = currentTrack?.id === item.id;
  
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.audioUrl) {
      playTrack(item);
    } else {
      // If it's an album (no direct audioUrl), we would normally navigate to an album page here
      console.log('Clicked album:', item.title);
      if (onClick) onClick();
    }
  };

  // Sanitize the HTML entities often returned by the API
  const decodeHtml = (html: string) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  return (
    <motion.div 
      className={twMerge("group relative flex flex-col space-y-3 cursor-pointer select-none w-[180px] shrink-0", className)}
      whileHover={{ y: -4 }}
      onClick={onClick}
    >
      {/* Cover Art Wrapper */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface/50 shadow-md">
        <img 
          src={imageUrl} 
          alt={item.title} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Glassmorphism Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          {/* Play Button */}
          <motion.div 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePlayClick}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 transform translate-y-3 group-hover:translate-y-0 transition-all duration-300"
          >
            {isCurrentTrack && isPlaying ? (
              <Pause fill="currentColor" className="h-6 w-6" />
            ) : (
              <Play fill="currentColor" className="h-6 w-6 ml-1" />
            )}
          </motion.div>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-col space-y-1">
        <h3 className="font-heading font-medium text-foreground text-sm truncate" title={decodeHtml(item.title)}>
          {decodeHtml(item.title)}
        </h3>
        <p className="text-xs text-text-secondary truncate" title={decodeHtml(subtitle)}>
          {decodeHtml(subtitle)}
        </p>
      </div>
    </motion.div>
  );
}
