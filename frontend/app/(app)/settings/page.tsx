'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  User as UserIcon,
  Sliders,
  Shield,
  Volume2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useUserProfile } from '@/hooks/use-user';
import { useAuthStore } from '@/stores/auth-store';
import { EditProfileForm } from '@/components/user/edit-profile-form';
import { PreferencesForm } from '@/components/user/preferences-form';
import { AccountDetails } from '@/components/user/account-details';
import { PlaybackSettingsInfo } from '@/components/user/playback-settings-info';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

type SettingsTab = 'preferences' | 'profile' | 'account' | 'playback';

export default function SettingsPage() {
  return (
    <React.Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </React.Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'preferences';

  const [activeTab, setActiveTab] = React.useState<SettingsTab>(initialTab);

  React.useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam && ['preferences', 'profile', 'account', 'playback'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const { user: authUser, isInitializing } = useAuthStore();
  const { data: userProfile, isLoading, isError, refetch } = useUserProfile();

  const displayUser = userProfile || authUser;

  if (isInitializing || (isLoading && !displayUser)) {
    return <SettingsSkeleton />;
  }

  if (isError && !displayUser) {
    return (
      <div role="alert" className="max-w-md mx-auto my-16 rounded-2xl border border-danger-500/20 bg-danger-950/10 p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-danger-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Could not load settings</h2>
        <p className="text-xs text-neutral-400">
          There was a problem retrieving your user information.
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

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'preferences', label: 'Music Preferences', icon: Sliders },
    { id: 'profile', label: 'Edit Profile', icon: UserIcon },
    { id: 'account', label: 'Account & Security', icon: Shield },
    { id: 'playback', label: 'Audio & Playback', icon: Volume2 },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400">
          Configure taste preferences, personal profile, account options, and audio playback.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar / Segmented Bar */}
        <aside className="md:col-span-4 lg:col-span-3">
          <nav
            aria-label="Settings navigation"
            className="flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none rounded-2xl bg-neutral-900/40 p-2 border border-white/5"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all text-left select-none',
                    isActive
                      ? 'bg-accent-600 text-white shadow-md shadow-accent-950/50'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Tab Content Panel */}
        <main className="md:col-span-8 lg:col-span-9">
          {activeTab === 'preferences' && <PreferencesForm />}
          {activeTab === 'profile' && <EditProfileForm user={displayUser} />}
          {activeTab === 'account' && <AccountDetails user={displayUser} />}
          {activeTab === 'playback' && <PlaybackSettingsInfo />}
        </main>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded bg-neutral-800" />
        <Skeleton className="h-4 w-64 rounded bg-neutral-800" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-4 lg:col-span-3 space-y-2">
          <Skeleton className="h-10 w-full rounded-xl bg-neutral-800" />
          <Skeleton className="h-10 w-full rounded-xl bg-neutral-800" />
          <Skeleton className="h-10 w-full rounded-xl bg-neutral-800" />
          <Skeleton className="h-10 w-full rounded-xl bg-neutral-800" />
        </div>

        <div className="md:col-span-8 lg:col-span-9">
          <Skeleton className="h-96 w-full rounded-2xl bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}
