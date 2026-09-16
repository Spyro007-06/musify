'use client';

import * as React from 'react';
import {
  Shield,
  Key,
  Mail,
  User as UserIcon,
  Calendar,
  Check,
  Copy,
  Info,
  Sparkles,
} from 'lucide-react';
import { User } from '@/types/user';
import { cn } from '@/lib/utils/cn';

interface AccountDetailsProps {
  user: User;
  className?: string;
}

export function AccountDetails({ user, className }: AccountDetailsProps) {
  const [copiedId, setCopiedId] = React.useState(false);

  const handleCopyId = () => {
    if (user.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 space-y-6',
        className
      )}
    >
      <div className="border-b border-white/5 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
          <Shield className="h-3.5 w-3.5" />
          Account & Security Overview
        </div>
        <h2 className="text-xl font-bold text-white">Account Information</h2>
        <p className="text-xs text-neutral-400">
          Core account identifiers, subscription tier, and authentication status.
        </p>
      </div>

      {/* Account Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email */}
        <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
            <Mail className="h-3.5 w-3.5 text-neutral-500" />
            <span>Primary Email</span>
          </div>
          <p className="text-sm font-semibold text-white truncate select-all">
            {user.email || 'No email attached'}
          </p>
        </div>

        {/* Username */}
        <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
            <UserIcon className="h-3.5 w-3.5 text-neutral-500" />
            <span>Username</span>
          </div>
          <p className="text-sm font-semibold text-white truncate select-all">
            @{user.username}
          </p>
        </div>

        {/* User ID */}
        <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-400">
            <div className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-neutral-500" />
              <span>User ID</span>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              {copiedId ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="text-xs font-mono text-neutral-300 truncate select-all">
            {user.id}
          </p>
        </div>

        {/* Subscription Tier */}
        <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Subscription Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider',
                user.isPremium
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-neutral-800 text-neutral-300 border border-white/5'
              )}
            >
              {user.isPremium ? 'Premium' : 'Standard Listener'}
            </span>
            {user.premiumUntil && (
              <span className="text-xs text-neutral-400">
                Until {new Date(user.premiumUntil).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Account Created */}
        <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
            <Calendar className="h-3.5 w-3.5 text-neutral-500" />
            <span>Account Created</span>
          </div>
          <p className="text-xs text-neutral-300">
            {formatDate(user.createdAt)}
          </p>
        </div>

        {/* Account Updated */}
        <div className="rounded-xl bg-neutral-950/40 p-4 border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
            <Calendar className="h-3.5 w-3.5 text-neutral-500" />
            <span>Last Profile Update</span>
          </div>
          <p className="text-xs text-neutral-300">
            {formatDate(user.updatedAt)}
          </p>
        </div>
      </div>

      {/* Honest notice on credentials & external authentication */}
      <div className="flex items-start gap-3 rounded-xl bg-neutral-950/60 p-4 border border-white/5 text-xs text-neutral-400">
        <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-neutral-300">Security & Credentials Management</p>
          <p className="leading-relaxed">
            Your login authentication, password security, and active sessions are securely managed through MUSIFY&apos;s centralized authentication provider. To modify your credentials or password, use the account recovery workflow on the login page.
          </p>
        </div>
      </div>
    </div>
  );
}
