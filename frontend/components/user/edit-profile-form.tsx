'use client';

import * as React from 'react';
import {
  User as UserIcon,
  Image as ImageIcon,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { User, UpdateProfileRequest } from '@/types/user';
import { useUpdateProfile } from '@/hooks/use-user';
import { cn } from '@/lib/utils/cn';

interface EditProfileFormProps {
  user: User;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function EditProfileForm({
  user,
  onSuccess,
  onCancel,
  className,
}: EditProfileFormProps) {
  const updateProfileMutation = useUpdateProfile();

  const [displayName, setDisplayName] = React.useState(user.displayName || '');
  const [avatarUrl, setAvatarUrl] = React.useState(user.avatarUrl || '');
  const [bio, setBio] = React.useState(user.bio || '');

  const [clientErrors, setClientErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = React.useState(false);

  // Sync state if user prop changes
  React.useEffect(() => {
    setDisplayName(user.displayName || '');
    setAvatarUrl(user.avatarUrl || '');
    setBio(user.bio || '');
  }, [user]);

  // Reset preview failure state when URL changes
  React.useEffect(() => {
    setPreviewFailed(false);
  }, [avatarUrl]);

  const isDirty =
    displayName !== (user.displayName || '') ||
    avatarUrl !== (user.avatarUrl || '') ||
    bio !== (user.bio || '');

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (displayName.trim().length > 60) {
      errs.displayName = 'Display name must not exceed 60 characters';
    }

    if (avatarUrl.trim()) {
      try {
        const parsed = new URL(avatarUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errs.avatarUrl = 'Avatar URL must use http:// or https://';
        }
      } catch {
        errs.avatarUrl = 'Please enter a valid URL (e.g. https://example.com/avatar.jpg)';
      }
    }

    if (bio.length > 500) {
      errs.bio = 'Bio must not exceed 500 characters';
    }

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    if (!validate()) {
      return;
    }

    const payload: UpdateProfileRequest = {
      displayName: displayName.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      bio: bio.trim() || undefined,
    };

    try {
      await updateProfileMutation.mutateAsync(payload);
      setSuccessMessage('Profile updated successfully!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        errObj?.response?.data?.message ||
        errObj?.message ||
        'Failed to update profile. Please try again.';
      setServerError(msg);
    }
  };

  const handleReset = () => {
    setDisplayName(user.displayName || '');
    setAvatarUrl(user.avatarUrl || '');
    setBio(user.bio || '');
    setClientErrors({});
    setServerError(null);
    setSuccessMessage(null);
    if (onCancel) {
      onCancel();
    }
  };

  const initials = (displayName || user.username || 'U')
    .slice(0, 2)
    .toUpperCase();

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'rounded-2xl border border-white/10 bg-neutral-900/60 p-6 sm:p-8 space-y-6',
        className
      )}
    >
      {/* Form Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          <p className="text-xs text-neutral-400">
            Update your public persona, avatar, and bio.
          </p>
        </div>
        {isDirty && (
          <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold text-purple-400 border border-purple-500/20">
            Unsaved Changes
          </span>
        )}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Server Error Notification */}
      {serverError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-950/20 p-3.5 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Avatar Section & Live Preview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 rounded-xl bg-neutral-950/40 p-4 border border-white/5">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-neutral-800 overflow-hidden border-2 border-purple-500/30 shadow-lg">
          {avatarUrl.trim() && !previewFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl.trim()}
              alt="Avatar preview"
              className="h-full w-full object-cover"
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <span className="text-xl font-bold text-neutral-300">{initials}</span>
          )}
        </div>

        <div className="flex-1 space-y-2 w-full">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-300">
            <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
            Avatar Image URL
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://images.unsplash.com/... or hosted image link"
            className={cn(
              'w-full rounded-xl bg-neutral-900 px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 border transition-all focus:outline-none focus:ring-1',
              clientErrors.avatarUrl
                ? 'border-red-500 focus:ring-red-500'
                : 'border-white/10 focus:border-purple-500 focus:ring-purple-500'
            )}
          />
          {clientErrors.avatarUrl ? (
            <p className="text-[11px] text-red-400">{clientErrors.avatarUrl}</p>
          ) : previewFailed && avatarUrl.trim() ? (
            <p className="text-[11px] text-amber-400">
              Could not load image preview from this URL. Please verify the URL points to a public image.
            </p>
          ) : (
            <p className="text-[11px] text-neutral-500">
              Paste a direct HTTPS URL to your avatar image.
            </p>
          )}
        </div>
      </div>

      {/* Display Name Field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-300">
            <UserIcon className="h-3.5 w-3.5 text-purple-400" />
            Display Name
          </label>
          <span className="text-[11px] text-neutral-500">
            {displayName.length} / 60
          </span>
        </div>
        <input
          type="text"
          maxLength={60}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={user.username || 'Your public display name'}
          className={cn(
            'w-full rounded-xl bg-neutral-900 px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 border transition-all focus:outline-none focus:ring-1',
            clientErrors.displayName
              ? 'border-red-500 focus:ring-red-500'
              : 'border-white/10 focus:border-purple-500 focus:ring-purple-500'
          )}
        />
        {clientErrors.displayName && (
          <p className="text-[11px] text-red-400">{clientErrors.displayName}</p>
        )}
      </div>

      {/* Username & Email Readonly Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Username
          </label>
          <div className="rounded-xl bg-neutral-950/60 px-3.5 py-2.5 text-xs text-neutral-400 border border-white/5 select-all">
            @{user.username}
          </div>
          <p className="text-[10px] text-neutral-500">
            Unique username identifier.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Email
          </label>
          <div className="rounded-xl bg-neutral-950/60 px-3.5 py-2.5 text-xs text-neutral-400 border border-white/5 select-all">
            {user.email || 'No email attached'}
          </div>
          <p className="text-[10px] text-neutral-500">
            Managed via authentication provider.
          </p>
        </div>
      </div>

      {/* Bio Textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-300">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            Bio
          </label>
          <span
            className={cn(
              'text-[11px]',
              bio.length > 500 ? 'text-red-400 font-bold' : 'text-neutral-500'
            )}
          >
            {bio.length} / 500
          </span>
        </div>
        <textarea
          rows={4}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell other listeners about your music tastes, favorite artists, or playlist themes..."
          className={cn(
            'w-full rounded-xl bg-neutral-900 p-3.5 text-xs text-white placeholder:text-neutral-500 border transition-all focus:outline-none focus:ring-1 resize-none',
            clientErrors.bio
              ? 'border-red-500 focus:ring-red-500'
              : 'border-white/10 focus:border-purple-500 focus:ring-purple-500'
          )}
        />
        {clientErrors.bio && (
          <p className="text-[11px] text-red-400">{clientErrors.bio}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
        {onCancel && (
          <button
            type="button"
            onClick={handleReset}
            disabled={updateProfileMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={!isDirty || updateProfileMutation.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-40 transition-all shadow-lg shadow-purple-950/40"
        >
          {updateProfileMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}
