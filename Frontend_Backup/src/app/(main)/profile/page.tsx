"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { apiClient } from "@/shared/services/api-client";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const displayName = user?.displayName || user?.username || "Guest";
  const initial = displayName.charAt(0).toUpperCase();

  const [editName, setEditName] = useState(displayName);
  const [editBio, setEditBio] = useState(user?.bio || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setEditName(user?.displayName || user?.username || "");
    setEditBio(user?.bio || "");
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiClient.put("/auth/profile", {
        displayName: editName,
        bio: editBio,
      });
      updateUser({ displayName: editName, bio: editBio });
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-12 max-w-2xl mx-auto select-none py-6">
      <div className="text-center md:text-left">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">User Profile</h2>
        <p className="text-white/40 text-xs">Manage your personal settings and public profile.</p>
      </div>

      <div className="glass-card rounded-[32px] p-8 md:p-10 border border-white/5 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
        {/* Avatar */}
        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 relative shadow-lg flex-shrink-0 bg-gradient-to-br from-[#4720ca] to-[#7B61FF] flex items-center justify-center font-black text-white text-3xl">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>

        <div className="flex-1 space-y-4 text-center md:text-left w-full">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-white/50 mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[#4cf479] text-sm"
                  placeholder="Display Name"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 mb-1 block">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-[#4cf479] text-sm resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>
              {saveError && (
                <p className="text-red-400 text-xs">{saveError}</p>
              )}
              <div className="flex justify-center md:justify-start gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#4cf479] hover:bg-[#69ff89] text-[#003913] font-bold text-xs px-5 py-2 rounded-full shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2 rounded-full border border-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight mb-1">
                {displayName}
              </h3>
              <p className="text-white/40 text-xs font-semibold mb-1">@{user?.username}</p>
              <p className="text-white/40 text-xs mb-3">{user?.email}</p>
              {user?.bio && (
                <p className="text-white/60 text-sm mb-3">{user.bio}</p>
              )}
              <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
                {user?.isPremium && (
                  <span className="bg-[#4cf479]/10 text-[#4cf479] border border-[#4cf479]/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Premium Member
                  </span>
                )}
                {user?.isVerified && (
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    Verified
                  </span>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-white/60 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-white/10 px-3 py-1 rounded-full bg-white/5"
                >
                  <span className="material-symbols-outlined text-xs">edit</span>
                  Edit Profile
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className="glass-card rounded-[24px] p-6 border border-white/5 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4cf479]">shield</span>
          Account Details
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-white/40 text-xs mb-1">Username</p>
            <p className="text-white font-semibold">@{user?.username || "—"}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Email</p>
            <p className="text-white font-semibold">{user?.email || "—"}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Role</p>
            <p className="text-white font-semibold capitalize">{user?.role?.toLowerCase() || "User"}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Status</p>
            <p className="text-white font-semibold">{user?.isVerified ? "Verified" : "Unverified"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
