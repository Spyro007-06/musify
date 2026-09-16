'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SearchSuggestionsProps {
  suggestions: string[];
  activeIndex?: number;
  onSelect: (item: string) => void;
  className?: string;
}

export function SearchSuggestions({
  suggestions,
  activeIndex = -1,
  onSelect,
  className,
}: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="Search suggestions"
      className={cn(
        'rounded-2xl border border-neutral-800 bg-neutral-900/95 py-2 shadow-2xl backdrop-blur-xl',
        className
      )}
    >
      {suggestions.map((item, idx) => {
        const isSelected = activeIndex === idx;
        return (
          <li
            key={`sug-${idx}-${item}`}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(item)}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors',
              isSelected
                ? 'bg-white/10 text-emerald-400 font-medium'
                : 'text-neutral-300 hover:bg-white/5 hover:text-white'
            )}
          >
            <Search className="h-4 w-4 shrink-0 text-neutral-500" />
            <span className="truncate">{item}</span>
          </li>
        );
      })}
    </ul>
  );
}
