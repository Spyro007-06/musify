import { useState } from 'react';
import { useLikedSongs, useRecentlyPlayed } from '../../hooks/useMusic';
import { usePlaylists, useCreatePlaylist } from '../../hooks/usePlaylists';
import { TrackRow, TrackListHeader } from '../../components/music/TrackRow';
import { useNavigate } from 'react-router-dom';
import { Loader2, Heart, Clock, ListMusic, Plus, Music } from 'lucide-react';
import { motion } from 'framer-motion';

type Tab = 'playlists' | 'liked' | 'recent';

export default function LibraryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('playlists');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const { data: playlists, isLoading: playlistsLoading } = usePlaylists();
  const { data: likedSongs, isLoading: likedLoading } = useLikedSongs();
  const { data: recentlyPlayed, isLoading: recentLoading } = useRecentlyPlayed();
  const createPlaylistMutation = useCreatePlaylist();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'playlists', label: 'Playlists', icon: <ListMusic className="w-4 h-4" /> },
    { id: 'liked', label: 'Liked Songs', icon: <Heart className="w-4 h-4" /> },
    { id: 'recent', label: 'Recently Played', icon: <Clock className="w-4 h-4" /> },
  ];

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await createPlaylistMutation.mutateAsync({ title: newPlaylistName.trim() });
    setNewPlaylistName('');
    setShowCreateModal(false);
  };

  const isLoading = activeTab === 'playlists' ? playlistsLoading : activeTab === 'liked' ? likedLoading : recentLoading;

  return (
    <motion.div
      className="flex flex-col pb-24 pt-2 px-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-heading font-bold text-foreground mb-6">Your Library</h1>

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

      {isLoading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Playlists Tab */}
      {activeTab === 'playlists' && !playlistsLoading && (
        <div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-3 w-full p-4 rounded-xl bg-surface/40 hover:bg-surface/60 border border-border/30 transition-colors mb-4"
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-highlight flex items-center justify-center shadow-md">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="font-medium text-foreground">Create Playlist</span>
          </button>

          {/* Liked Songs Card */}
          <div
            onClick={() => setActiveTab('liked')}
            className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 cursor-pointer transition-colors mb-2"
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#2563eb] flex items-center justify-center shadow-md">
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Liked Songs</p>
              <p className="text-xs text-text-secondary">{likedSongs?.length || 0} songs</p>
            </div>
          </div>

          {playlists?.map(pl => (
            <div
              key={pl.id}
              onClick={() => navigate(`/playlist/${pl.id}`)}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-surface/60 flex items-center justify-center overflow-hidden shadow-md">
                {pl.coverUrl ? (
                  <img src={pl.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-5 h-5 text-text-secondary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{pl.title}</p>
                <p className="text-xs text-text-secondary">{pl.trackCount} songs</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Liked Songs Tab */}
      {activeTab === 'liked' && !likedLoading && (
        <div>
          {likedSongs && likedSongs.length > 0 ? (
            <>
              <TrackListHeader />
              {likedSongs.map((track, i) => (
                <TrackRow key={track.id} track={track} index={i} context={likedSongs} showAlbum />
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
              <Heart className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">No liked songs yet</p>
              <p className="text-sm mt-1">Tap the heart icon on any song to save it here</p>
            </div>
          )}
        </div>
      )}

      {/* Recently Played Tab */}
      {activeTab === 'recent' && !recentLoading && (
        <div>
          {recentlyPlayed && recentlyPlayed.length > 0 ? (
            <>
              <TrackListHeader />
              {recentlyPlayed.map((track, i) => (
                <TrackRow key={track.id} track={track} index={i} context={recentlyPlayed} showAlbum />
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
              <Clock className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg">No listening history yet</p>
              <p className="text-sm mt-1">Start playing songs to build your history</p>
            </div>
          )}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center" onClick={() => setShowCreateModal(false)}>
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-heading font-bold text-foreground mb-4">Create Playlist</h2>
            <input
              autoFocus
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
              className="w-full h-12 px-4 rounded-lg bg-background border border-border text-foreground placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-foreground transition-colors">Cancel</button>
              <button onClick={handleCreatePlaylist} className="px-6 py-2 text-sm bg-primary text-white rounded-full font-medium hover:bg-primary/80 transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
