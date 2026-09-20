'use client';

import * as React from 'react';
import {
  User as UserIcon,
  Image as ImageIcon,
  Upload,
  Save,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { User, UpdateProfileRequest } from '@/types/user';
import { useUpdateProfile } from '@/hooks/use-user';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';
import { fileToAvatarDataUrl } from '@/lib/utils/resize-image';

const MAX_AVATAR_FILE_SIZE = 8 * 1024 * 1024; // 8MB raw upload; the encoded result is far smaller

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

  const [clientErrors, setClientErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const [isProcessingImage, setIsProcessingImage] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync state if user prop changes
  React.useEffect(() => {
    setDisplayName(user.displayName || '');
    setAvatarUrl(user.avatarUrl || '');
  }, [user]);

  // Reset preview failure state when URL changes
  React.useEffect(() => {
    setPreviewFailed(false);
  }, [avatarUrl]);

  const isDirty =
    displayName !== (user.displayName || '') ||
    avatarUrl !== (user.avatarUrl || '');

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (displayName.trim().length > 60) {
      errs.displayName = 'Display name must not exceed 60 characters';
    }

    setClientErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    const payload: UpdateProfileRequest = {
      displayName: displayName.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
    };

    try {
      await updateProfileMutation.mutateAsync(payload);
      // A toast (rather than an inline banner) is always visible regardless
      // of scroll position — this form can run long enough that a banner
      // right below the header goes unseen after saving from the bottom.
      toast.success('Profile updated successfully!');
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

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after an error

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setClientErrors((prev) => ({ ...prev, avatarUrl: 'Please choose an image file.' }));
      return;
    }
    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setClientErrors((prev) => ({ ...prev, avatarUrl: 'Image must be smaller than 8MB.' }));
      return;
    }

    setClientErrors((prev) => {
      const { avatarUrl: _drop, ...rest } = prev;
      return rest;
    });
    setIsProcessingImage(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
      setPreviewFailed(false);
    } catch {
      setClientErrors((prev) => ({ ...prev, avatarUrl: 'Could not process this image. Try a different file.' }));
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleReset = () => {
    setDisplayName(user.displayName || '');
    setAvatarUrl(user.avatarUrl || '');
    setClientErrors({});
    setServerError(null);
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
            Update your public persona and avatar.
          </p>
        </div>
        {isDirty && (
          <span className="rounded-full bg-accent-500/10 px-2.5 py-1 text-[11px] font-semibold text-accent-400 border border-accent-500/20">
            Unsaved Changes
          </span>
        )}
      </div>

      {/* Server Error Notification */}
      {serverError && <Alert variant="danger">{serverError}</Alert>}

      {/* Avatar Section & Live Preview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 rounded-xl bg-neutral-950/40 p-4 border border-white/5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Change profile photo"
          className="group relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-neutral-800 overflow-hidden border-2 border-accent-500/30 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
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
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            {isProcessingImage ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : (
              <Upload className="h-5 w-5 text-white" />
            )}
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarFileChange}
          className="hidden"
        />

        <div className="flex-1 space-y-2 w-full">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-300">
            <ImageIcon className="h-3.5 w-3.5 text-accent-400" />
            Profile Photo
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3.5 py-2.5 text-xs font-semibold text-white border border-white/10 hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isProcessingImage ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {isProcessingImage ? 'Processing...' : avatarUrl.trim() ? 'Change photo' : 'Upload photo'}
          </button>
          {clientErrors.avatarUrl ? (
            <p className="text-[11px] text-danger-400">{clientErrors.avatarUrl}</p>
          ) : previewFailed && avatarUrl.trim() ? (
            <p className="text-[11px] text-amber-400">
              This image could not be loaded. Try uploading it again.
            </p>
          ) : (
            <p className="text-[11px] text-neutral-500">
              JPG, PNG, or WebP from your device. Max 8MB.
            </p>
          )}
        </div>
      </div>

      {/* Display Name Field */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-300">
            <UserIcon className="h-3.5 w-3.5 text-accent-400" />
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
              ? 'border-danger-500 focus:ring-danger-500'
              : 'border-white/10 focus:border-accent-500 focus:ring-accent-500'
          )}
        />
        {clientErrors.displayName && (
          <p className="text-[11px] text-danger-400">{clientErrors.displayName}</p>
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
          disabled={!isDirty || updateProfileMutation.isPending || isProcessingImage}
          className="inline-flex items-center gap-2 rounded-full bg-accent-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-accent-500 disabled:opacity-40 transition-all shadow-lg shadow-accent-950/40"
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
