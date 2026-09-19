'use client';

import * as React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useSearchSuggestions } from '@/hooks/use-search';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils/cn';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'What do you want to play?',
  autoFocus = false,
  className,
}: SearchInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Debounce typed text for suggestion query (~250ms)
  const debouncedSuggestQuery = useDebounce(value, 250);
  const { data: suggestions, isLoading: isSuggestionsLoading } =
    useSearchSuggestions(debouncedSuggestQuery);

  const hasSuggestions = Boolean(
    isOpen &&
    debouncedSuggestQuery.trim().length >= 2 &&
    suggestions &&
    suggestions.length > 0
  );

  // Close suggestions on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset active index when suggestions list changes
  React.useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  const handleSelect = (query: string) => {
    onChange(query);
    onSubmit(query);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hasSuggestions || !suggestions) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (value.trim()) {
          onSubmit(value.trim());
          setIsOpen(false);
          inputRef.current?.blur();
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      } else if (value.trim()) {
        onSubmit(value.trim());
        setIsOpen(false);
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleClear = () => {
    onChange('');
    onSubmit('');
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-2xl', className)}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <label htmlFor="search-input-field" className="sr-only">
          Search songs, artists, albums, or playlists
        </label>
        <div className="pointer-events-none absolute left-4 flex items-center justify-center text-neutral-400">
          <Search className="h-5 w-5" />
        </div>

        <input
          ref={inputRef}
          id="search-input-field"
          type="text"
          role="combobox"
          aria-expanded={hasSuggestions}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls="search-suggestions-list"
          aria-activedescendant={
            activeIndex >= 0 ? `suggestion-item-${activeIndex}` : undefined
          }
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'h-12 sm:h-14 w-full rounded-full bg-neutral-900/90 pl-12 pr-12 text-sm sm:text-base text-white',
            'border border-neutral-800 placeholder:text-neutral-500 shadow-xl backdrop-blur-md transition-all duration-200',
            'focus:border-brand-500 focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-brand-500',
            hasSuggestions && 'rounded-b-2xl'
          )}
        />

        {/* Right side: Loading Spinner or Clear Button */}
        <div className="absolute right-4 flex items-center gap-2">
          {isSuggestionsLoading && debouncedSuggestQuery.trim().length >= 2 ? (
            <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search input"
              className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Autocomplete / Suggestions Dropdown Popup */}
      {hasSuggestions && suggestions && (
        <ul
          id="search-suggestions-list"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/95 py-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {suggestions.map((item, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <li
                key={`suggestion-${idx}-${item}`}
                id={`suggestion-item-${idx}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(item)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-white/10 text-brand-400 font-medium'
                    : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                )}
              >
                <Search className={cn('h-4 w-4 shrink-0', isSelected ? 'text-brand-400' : 'text-neutral-500')} />
                <span className="truncate">{item}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
