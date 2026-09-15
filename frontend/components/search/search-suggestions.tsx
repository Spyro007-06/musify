'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SearchSuggestionsProps {
  suggestions: string[];
  onSelect: (item: string) => void;
  className?: string;
}

export function SearchSuggestions({
  suggestions,
  onSelect,
  className,
}: SearchSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-800 bg-neutral-900 p-2 shadow-xl',
        className
      )}
    >
      {suggestions.map((item) => (
        <button
          key={item}
          onClick={() => onSelect(item)}
          className="flex w-full items-center px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white rounded"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
