import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearch } from '../../hooks/useMusic';
import { AlbumCard } from '../../components/music/AlbumCard';
import { TrackRow, TrackListHeader } from '../../components/music/TrackRow';
import { Loader2, Music, Disc, Mic2, ListMusic } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

type Tab = 'all' | 'tracks' | 'albums' | 'artists' | 'playlists';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const { data: results, isLoading } = useSearch(query);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: null },
    { id: 'tracks', label: 'Songs', icon: <Music className="w-4 h-4" /> },
    { id: 'albums', label: 'Albums', icon: <Disc className="w-4 h-4" /> },
    { id: 'artists', label: 'Artists', icon: <Mic2 className="w-4 h-4" /> },
    { id: 'playlists', label: 'Playlists', icon: <ListMusic className="w-4 h-4" /> },
  ];

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary">
        <Music className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">Search for songs, albums, or artists</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tracks = results?.tracks || [];
  const albums = results?.albums || [];
  const artists = results?.artists || [];
  const playlists = results?.playlists || [];

  return (
    <motion.div 
      className="flex flex-col pb-24 pt-2 px-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-foreground text-background' 
                : 'bg-surface/60 text-text-secondary hover:text-foreground hover:bg-surface'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Songs */}
      {(activeTab === 'all' || activeTab === 'tracks') && tracks.length > 0 && (
        <section className="mb-8">
          {activeTab === 'all' && <h2 className="text-xl font-heading font-bold text-foreground mb-4">Songs</h2>}
          <TrackListHeader />
          {tracks.slice(0, activeTab === 'all' ? 5 : undefined).map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} context={tracks} showAlbum />
          ))}
        </section>
      )}

      {/* Albums */}
      {(activeTab === 'all' || activeTab === 'albums') && albums.length > 0 && (
        <section className="mb-8">
          {activeTab === 'all' && <h2 className="text-xl font-heading font-bold text-foreground mb-4">Albums</h2>}
          <div className="flex flex-wrap gap-6">
            {albums.slice(0, activeTab === 'all' ? 6 : undefined).map(album => (
              <AlbumCard
                key={album.id}
                item={{ id: album.id, title: album.title, artwork: album.artwork, artist: album.artist }}
                onClick={() => navigate(`/album/${album.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Artists */}
      {(activeTab === 'all' || activeTab === 'artists') && artists.length > 0 && (
        <section className="mb-8">
          {activeTab === 'all' && <h2 className="text-xl font-heading font-bold text-foreground mb-4">Artists</h2>}
          <div className="flex flex-wrap gap-6">
            {artists.slice(0, activeTab === 'all' ? 6 : undefined).map(artist => (
              <div
                key={artist.id}
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="group flex flex-col items-center space-y-3 cursor-pointer w-[160px]"
              >
                <div className="w-[140px] h-[140px] rounded-full overflow-hidden bg-surface/50 shadow-lg group-hover:shadow-primary/20 transition-shadow">
                  <img
                    src={artist.image?.replace(/50x50|150x150/g, '500x500') || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=random&size=500&rounded=true`}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-sm font-medium text-foreground truncate text-center w-full">{artist.name}</p>
                <p className="text-xs text-text-secondary">Artist</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Playlists */}
      {(activeTab === 'all' || activeTab === 'playlists') && playlists.length > 0 && (
        <section className="mb-8">
          {activeTab === 'all' && <h2 className="text-xl font-heading font-bold text-foreground mb-4">Playlists</h2>}
          <div className="flex flex-wrap gap-6">
            {playlists.slice(0, activeTab === 'all' ? 6 : undefined).map(pl => (
              <AlbumCard
                key={pl.id}
                item={{ id: pl.id, title: pl.title, artwork: pl.cover }}
                onClick={() => navigate(`/playlist/${pl.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* No Results */}
      {tracks.length === 0 && albums.length === 0 && artists.length === 0 && playlists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Music className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">No results found for "{query}"</p>
          <p className="text-sm mt-1">Try different keywords or check your spelling</p>
        </div>
      )}
    </motion.div>
  );
}
