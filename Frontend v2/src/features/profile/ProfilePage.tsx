import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { User as UserIcon, Mail, Shield, Edit2, Upload, Link as LinkIcon, Save, X, Music, LogOut } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../lib/apiClient';

interface PresetAvatar {
  id: string;
  name: string;
  url: string;
}

const PRESET_AVATARS: PresetAvatar[] = [
  { id: '1', name: 'Cyber Neon Purple', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop&q=80' },
  { id: '2', name: 'Synthwave Sunset', url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150&h=150&fit=crop&q=80' },
  { id: '3', name: 'Cyberpunk Headphones', url: 'https://images.unsplash.com/photo-1546529038-df15a024744f?w=150&h=150&fit=crop&q=80' },
  { id: '4', name: 'Abstract Music Wave', url: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=150&h=150&fit=crop&q=80' },
  { id: '5', name: 'Neon Vinyl', url: 'https://images.unsplash.com/photo-1539625319138-1ee02ee103ac?w=150&h=150&fit=crop&q=80' },
  { id: '6', name: 'Retro Boombox', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&h=150&fit=crop&q=80' },
  { id: '7', name: 'Future Grid', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&h=150&fit=crop&q=80' },
  { id: '8', name: 'Neon Cyber Face', url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=150&h=150&fit=crop&q=80' }
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  
  // Reload details from API on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/user/profile');
        const profile = res.data.data;
        if (profile) {
          setDisplayName(profile.displayName || '');
          setBio(profile.bio || '');
          setAvatarUrl(profile.avatarUrl || '');
          updateUser(profile);
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      }
    };
    fetchProfile();
  }, [updateUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarUrl(base64String);
      setShowAvatarModal(false);
      toast.success('Local image loaded successfully.');
    };
    reader.readAsDataURL(file);
  };

  const handleCustomUrlSubmit = () => {
    if (!customUrlInput.trim()) return;
    setAvatarUrl(customUrlInput.trim());
    setCustomUrlInput('');
    setShowAvatarModal(false);
    toast.success('Custom avatar URL set.');
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error('Display Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient.put('/user/profile', {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl
      });
      
      const updatedData = res.data.data;
      updateUser(updatedData);
      toast.success('Profile updated successfully!');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get initials for fallback avatar
  const getInitials = () => {
    if (!displayName) return 'M';
    return displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex items-center gap-2 mb-8">
        <UserIcon className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">User Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar Customizer Card */}
        <div className="md:col-span-1 flex flex-col items-center">
          <div className="w-full glass-panel rounded-3xl p-6 border border-white/5 flex flex-col items-center text-center">
            {/* Avatar Preview */}
            <div className="relative group w-40 h-40 rounded-full overflow-hidden border-3 border-primary/20 hover:border-primary transition-all duration-300 shadow-xl mb-4 bg-surface/50">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-primary/10 to-highlight/10 text-3xl font-bold text-primary">
                  {getInitials()}
                </div>
              )}
              {/* Overlay edit state */}
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 text-white text-xs font-semibold cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                Customize
              </button>
            </div>

            <h2 className="text-xl font-bold text-foreground truncate w-full">{displayName || user?.username}</h2>
            <p className="text-xs text-text-secondary mt-1 tracking-wider uppercase font-bold">{user?.role}</p>

            <button
              onClick={() => setShowAvatarModal(true)}
              className="mt-6 text-xs text-primary hover:text-highlight font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Change Profile Picture
            </button>

            <button
              onClick={() => navigate('/onboarding?edit=true')}
              className="mt-4 text-xs text-primary hover:text-highlight font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Music className="w-3.5 h-3.5" />
              Edit Music Preferences
            </button>

            <button
              onClick={() => {
                logout();
                toast.success('Logged out successfully');
                navigate('/login');
              }}
              className="mt-4 text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Right Column: Editable details */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 space-y-6">
            <h3 className="text-lg font-bold text-foreground border-b border-white/5 pb-3 flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              Account Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Username (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5" />
                  Username
                </label>
                <div className="p-3.5 rounded-xl bg-white/2 border border-white/5 text-sm text-text-secondary select-all font-semibold">
                  {user?.username}
                </div>
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Email Address
                </label>
                <div className="p-3.5 rounded-xl bg-white/2 border border-white/5 text-sm text-text-secondary select-all font-semibold">
                  {user?.email}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Role (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Account Role
                </label>
                <div className="p-3.5 rounded-xl bg-white/2 border border-white/5 text-sm text-text-secondary font-semibold uppercase tracking-wider">
                  {user?.role}
                </div>
              </div>

              {/* Display Name (Editable) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  Display Name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter display name"
                  className="w-full bg-white/3 border-white/5 focus:border-primary text-sm font-semibold rounded-xl"
                />
              </div>
            </div>

            {/* Biography (Editable) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                Music Biography
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about your musical tastes..."
                rows={4}
                className="w-full bg-white/3 border border-white/5 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-sm text-foreground rounded-xl p-3.5 resize-none transition-all duration-300"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button
                variant="outline"
                type="button"
                onClick={() => navigate('/')}
                disabled={isSaving}
                className="font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                isLoading={isSaving}
                className="flex items-center gap-1.5 font-bold shadow-lg shadow-primary/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Customizable Avatar Modal Dialog */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowAvatarModal(false)} />
          <div className="relative z-10 w-full max-w-lg glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" />
                Customize Avatar
              </h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-text-secondary hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Preselected avatars */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                Choose from presets
              </span>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_AVATARS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setAvatarUrl(preset.url);
                      setShowAvatarModal(false);
                      toast.success(`Preset "${preset.name}" selected.`);
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all duration-300 cursor-pointer hover:scale-105 ${
                      avatarUrl === preset.url ? 'border-primary shadow-[0_0_10px_var(--color-primary)]' : 'border-white/5'
                    }`}
                    title={preset.name}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Custom URL */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                Direct Image Link
              </span>
              <div className="flex gap-2">
                <Input
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="Paste URL (e.g. https://example.com/avatar.jpg)"
                  className="flex-1 bg-white/3 border-white/5 rounded-xl text-sm"
                />
                <Button onClick={handleCustomUrlSubmit} className="cursor-pointer">
                  Set
                </Button>
              </div>
            </div>

            {/* Section 3: File Upload */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Upload File (JPG, PNG - Max 2MB)
              </span>
              <div className="relative h-14 border border-dashed border-white/10 rounded-xl bg-white/2 hover:bg-white/4 flex items-center justify-center text-xs text-text-secondary cursor-pointer transition-all duration-300">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-4 h-4 mr-2 text-primary" />
                <span>Drag file here or click to browse</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
