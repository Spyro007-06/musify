'use client';

import * as React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isSearching?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Plain search box. Results update live below it as you type (Spotify-style),
 * so there's no suggestions dropdown competing with them.
 */
export function SearchInput({
  value,
  onChange,
  isSearching = false,
  placeholder = 'What do you want to play?',
  autoFocus = false,
  className,
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn('relative w-full max-w-2xl', className)}>
      <div className="relative flex items-center">
        <label htmlFor="search-input-field" className="sr-only">
          Search songs, artists, albums, or playlists
        </label>
        {/* z-10: the input's backdrop-blur would otherwise paint over the icon */}
        <div className="pointer-events-none absolute left-4 z-10 flex items-center justify-center text-neutral-400">
          <Search className="h-5 w-5" />
        </div>

        <input
          ref={inputRef}
          id="search-input-field"
          type="text"
          enterKeyHint="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          // Enter just drops the mobile keyboard; results are already live.
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.blur()}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'h-12 sm:h-14 w-full rounded-full bg-neutral-900/90 pl-12 pr-12 text-sm sm:text-base text-white',
            'border border-neutral-800 placeholder:text-neutral-500 shadow-xl backdrop-blur-md transition-all duration-200',
            'focus:border-brand-500 focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-brand-500'
          )}
        />

        <div className="absolute right-2 z-10 flex items-center gap-2">
          {isSearching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-neutral-400" aria-label="Searching" />
          ) : value ? (
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search input"
              className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
