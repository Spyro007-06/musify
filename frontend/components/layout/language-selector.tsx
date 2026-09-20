'use client';

import * as React from 'react';
import { Languages, Check } from 'lucide-react';
import { useUserPreferences, useUpdatePreferences } from '@/hooks/use-user';
import { LANGUAGE_OPTIONS } from '@/lib/constants/languages';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';

interface LanguageSelectorProps {
  className?: string;
}

/**
 * Quick-access language filter, mirroring the UserMenu dropdown pattern.
 * Reads/writes the same `favouriteLanguages` preference as the full
 * Settings form — one source of truth, just a faster path to change it
 * without leaving whatever page you're on. Once set, the backend treats
 * it as a strict filter everywhere (Home, Search, Browse, AI playlists),
 * not just a ranking bias.
 */
export function LanguageSelector({ className }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { data: preferences } = useUserPreferences();
  const updateMutation = useUpdatePreferences();

  const selected = preferences?.favouriteLanguages || [];
  // Stored values aren't guaranteed to share this list's Title Case (the
  // backend treats language matching as case-insensitive everywhere else),
  // so compare loosely but keep this list's canonical casing when writing.
  const selectedLower = selected.map((l) => l.toLowerCase());
  const isSelected = (lang: string) => selectedLower.includes(lang.toLowerCase());

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const toggleLanguage = (lang: string) => {
    if (!preferences) return;
    const next = isSelected(lang)
      ? selected.filter((l) => l.toLowerCase() !== lang.toLowerCase())
      : [...selected, lang];
    updateMutation.mutate(
      { ...preferences, favouriteLanguages: next },
      {
        onSuccess: () => {
          toast.success(
            next.length === 0
              ? 'Language filter cleared.'
              : `Now showing ${next.join(', ')} only.`
          );
        },
        onError: () => {
          toast.error('Failed to update language preference. Please try again.');
        },
      }
    );
  };

  const label = selected.length === 0 ? 'Language' : selected.length === 1 ? selected[0] : `${selected.length} languages`;

  return (
    <div ref={menuRef} className={cn('relative inline-block text-left', className)}>
      <button
        type="button"
        id="language-selector-button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Filter by language"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400',
          selected.length > 0
            ? 'border-brand-500/40 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20'
            : 'border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800'
        )}
      >
        <Languages className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[100px] truncate">{label}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-selector-button"
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-neutral-800 bg-neutral-950 p-1.5 shadow-2xl backdrop-blur focus:outline-none"
        >
          <div className="px-3 py-2 border-b border-neutral-800/80 mb-1">
            <p className="text-xs font-semibold text-white">Show only these languages</p>
            <p className="text-[11px] text-neutral-400">Applies across the whole app</p>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {LANGUAGE_OPTIONS.map((lang) => {
              const isChecked = isSelected(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isChecked}
                  disabled={updateMutation.isPending}
                  onClick={() => toggleLanguage(lang)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-50"
                >
                  <span>{lang}</span>
                  {isChecked && <Check className="h-3.5 w-3.5 text-brand-400" />}
                </button>
              );
            })}
          </div>

          {selected.length > 0 && (
            <>
              <div className="my-1 border-t border-neutral-800" />
              <button
                type="button"
                role="menuitem"
                disabled={updateMutation.isPending}
                onClick={() => {
                  if (!preferences) return;
                  updateMutation.mutate(
                    { ...preferences, favouriteLanguages: [] },
                    { onSuccess: () => toast.success('Language filter cleared.') }
                  );
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white text-left disabled:opacity-50"
              >
                Clear filter
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
