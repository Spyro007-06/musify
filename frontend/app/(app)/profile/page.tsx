'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Heart,
  ListMusic,
  Sliders,
  History,
  AlertCircle,
  RefreshCw,
  Edit3,
  UserCheck,
} from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user';
import { useAuthStore } from '@/stores/auth-store';
import { ProfileHeader } from '@/components/user/profile-header';
import { EditProfileForm } from '@/components/user/edit-profile-form';
import { AccountDetails } from '@/components/user/account-details';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

export default function ProfilePage() {
  const { user: authUser, isInitializing } = useAuthStore();
  const { data: userProfile, isLoading, isError, error, refetch } = useUserProfile();

  const [activeTab, setActiveTab] = React.useState<'overview' | 'edit'>('overview');

  // Fallback to auth user if profile query is still loading or resolving
  const displayUser = userProfile || authUser;

  if (isInitializing || (isLoading && !displayUser)) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 animate-pulse">
        {/* Skeleton Profile Header */}
        <div className="rounded-3xl bg-neutral-900/60 p-8 border border-white/5 space-y-4">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-3xl bg-neutral-800" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24 rounded-full bg-neutral-800" />
              <Skeleton className="h-8 w-64 rounded bg-neutral-800" />
              <Skeleton className="h-4 w-40 rounded bg-neutral-800" />
            </div>
          </div>
        </div>

        {/* Skeleton Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl bg-neutral-900/60" />
          <Skeleton className="h-28 rounded-2xl bg-neutral-900/60" />
          <Skeleton className="h-28 rounded-2xl bg-neutral-900/60" />
        </div>
      </div>
    );
  }

  if (isError && !displayUser) {
    return (
      <div role="alert" className="max-w-md mx-auto my-16 rounded-2xl border border-red-500/20 bg-red-950/10 p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Failed to load profile</h2>
        <p className="text-xs text-neutral-400">
          {error?.message || 'Unable to retrieve your profile information.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try Again
        </button>
      </div>
    );
  }

  if (!displayUser) {
    return null;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      {/* Profile Header Hero */}
      <ProfileHeader
        user={displayUser}
        onEditClick={() => setActiveTab(activeTab === 'edit' ? 'overview' : 'edit')}
      />

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all select-none',
            activeTab === 'overview'
              ? 'bg-white text-black shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          )}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Overview & Activity
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all select-none',
            activeTab === 'edit'
              ? 'bg-white text-black shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit Profile
        </button>
      </div>

      {activeTab === 'edit' ? (
        <EditProfileForm
          user={displayUser}
          onSuccess={() => {
            setActiveTab('overview');
            refetch();
          }}
          onCancel={() => setActiveTab('overview')}
        />
      ) : (
        <div className="space-y-8">
          {/* Activity & Library Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Liked Songs Shortcut */}
            <Link
              href="/library/liked"
              className="group flex flex-col justify-between rounded-2xl bg-neutral-900/60 p-5 border border-white/5 hover:border-purple-500/30 hover:bg-neutral-850 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 group-hover:scale-105 transition-transform">
                  <Heart className="h-5 w-5 fill-current" />
                </div>
                <span className="text-[11px] font-medium text-neutral-500 group-hover:text-purple-400 transition-colors">
                  View All →
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                  Liked Songs
                </h3>
                <p className="text-xs text-neutral-400">
                  Your curated favorite tracks and personal rotation
                </p>
              </div>
            </Link>

            {/* Playlists Shortcut */}
            <Link
              href="/library/playlists"
              className="group flex flex-col justify-between rounded-2xl bg-neutral-900/60 p-5 border border-white/5 hover:border-purple-500/30 hover:bg-neutral-850 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 group-hover:scale-105 transition-transform">
                  <ListMusic className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium text-neutral-500 group-hover:text-purple-400 transition-colors">
                  View All →
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  Your Playlists
                </h3>
                <p className="text-xs text-neutral-400">
                  Custom collections and AI-generated mixes
                </p>
              </div>
            </Link>

            {/* Listening History Shortcut */}
            <Link
              href="/library/recently-played"
              className="group flex flex-col justify-between rounded-2xl bg-neutral-900/60 p-5 border border-white/5 hover:border-purple-500/30 hover:bg-neutral-850 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:scale-105 transition-transform">
                  <History className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium text-neutral-500 group-hover:text-purple-400 transition-colors">
                  View All →
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Recently Played
                </h3>
                <p className="text-xs text-neutral-400">
                  Past streaming sessions and listening log
                </p>
              </div>
            </Link>
          </div>

          {/* Account Details */}
          <AccountDetails user={displayUser} />

          {/* Preference Tuning Teaser */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-neutral-900 to-neutral-900 p-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                <Sliders className="h-3.5 w-3.5" />
                Algorithm Personalization
              </div>
              <h3 className="text-base font-bold text-white">
                Customize Music Preferences
              </h3>
              <p className="text-xs text-neutral-400 max-w-xl">
                Fine-tune your favorite genres, languages, moods, artists, and albums to improve daily recommendations and AI studio curation.
              </p>
            </div>

            <Link
              href="/settings?tab=preferences"
              className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-950/50 shrink-0"
            >
              <Sliders className="h-3.5 w-3.5" />
              Tune Preferences
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
