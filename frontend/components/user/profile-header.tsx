'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle,
  Sparkles,
  Edit3,
  Sliders,
  Mail,
} from 'lucide-react';
import { User } from '@/types/user';
import { cn } from '@/lib/utils/cn';

interface ProfileHeaderProps {
  user: User;
  onEditClick?: () => void;
  className?: string;
}

export function ProfileHeader({
  user,
  onEditClick,
  className,
}: ProfileHeaderProps) {
  const [imageError, setImageError] = React.useState(false);

  const initials = (user.displayName || user.username || 'U')
    .slice(0, 2)
    .toUpperCase();

  const memberSince = React.useMemo(() => {
    if (!user.createdAt) return null;
    try {
      const d = new Date(user.createdAt);
      return d.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  }, [user.createdAt]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-950/40 via-neutral-900/90 to-neutral-900 p-6 sm:p-8',
        className
      )}
    >
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-purple-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-3xl bg-neutral-800 border-2 border-purple-500/30 shadow-2xl overflow-hidden">
          {user.avatarUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.username}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl font-extrabold text-white tracking-wider">
              {initials}
            </span>
          )}

          {user.isPremium && (
            <div className="absolute bottom-1 right-1 rounded-full bg-amber-500 p-1 text-black shadow-md" title="Premium Subscriber">
              <Sparkles className="h-3 w-3 fill-current" />
            </div>
          )}
        </div>

        {/* User Identity Details */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300 border border-purple-500/30">
              {user.role || 'Listener'}
            </span>

            {user.isPremium && (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30">
                Premium
              </span>
            )}

            {user.isVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white truncate">
            {user.displayName || user.username}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
            <span className="text-neutral-300 font-medium">@{user.username}</span>

            {user.email && (
              <span className="inline-flex items-center gap-1 text-neutral-400">
                <Mail className="h-3 w-3 text-neutral-500" />
                {user.email}
              </span>
            )}

            {memberSince && (
              <span className="inline-flex items-center gap-1 text-neutral-400">
                <Calendar className="h-3 w-3 text-neutral-500" />
                Joined {memberSince}
              </span>
            )}
          </div>

          {user.bio ? (
            <p className="text-xs sm:text-sm text-neutral-300 pt-1 leading-relaxed max-w-2xl">
              {user.bio}
            </p>
          ) : (
            <p className="text-xs text-neutral-500 italic pt-1">
              No bio added yet. Tell the MUSIFY community about your music taste!
            </p>
          )}
        </div>

        {/* Action Shortcuts */}
        <div className="flex sm:flex-col items-center gap-2 self-stretch sm:self-center shrink-0">
          {onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Profile
            </button>
          )}

          <Link
            href="/settings"
            className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-full bg-purple-600/20 px-4 py-2 text-xs font-semibold text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
