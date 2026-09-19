'use client';

import * as React from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  label?: string;
  helperText?: string;
  className?: string;
}

export function TagInput({
  tags,
  onChange,
  placeholder = 'Add a tag...',
  maxTags = 20,
  label,
  helperText,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleAddTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Split by comma if pasted or typed
    const candidateParts = trimmed
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    const newTags = [...tags];
    for (const part of candidateParts) {
      if (newTags.length >= maxTags) break;
      const alreadyExists = newTags.some(
        (t) => t.toLowerCase() === part.toLowerCase()
      );
      if (!alreadyExists) {
        newTags.push(part);
      }
    }

    onChange(newTags);
    setInputValue('');
  };

  const handleRemoveTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      e.preventDefault();
      handleRemoveTag(tags.length - 1);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            {label}
          </label>
          <span className="text-[11px] text-neutral-500">
            {tags.length} / {maxTags}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/80 p-2.5 focus-within:border-accent-500/50 focus-within:ring-1 focus-within:ring-accent-500/30 transition-all">
        {/* Render existing tags */}
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-950/60 border border-accent-500/30 px-2.5 py-1 text-xs font-medium text-accent-200"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(idx)}
              aria-label={`Remove ${tag}`}
              className="rounded-full p-0.5 text-accent-400 hover:bg-accent-800/50 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Input field */}
        {tags.length < maxTags && (
          <div className="flex min-w-[140px] flex-1 items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={tags.length === 0 ? placeholder : 'Add another...'}
              className="w-full bg-transparent px-2 py-1 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
            />
            {inputValue.trim() && (
              <button
                type="button"
                onClick={() => handleAddTag(inputValue)}
                className="rounded-md bg-white/10 p-1 text-neutral-300 hover:bg-white/20 hover:text-white transition-colors"
                title="Add tag"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {helperText && (
        <p className="text-[11px] text-neutral-500">{helperText}</p>
      )}
    </div>
  );
}
