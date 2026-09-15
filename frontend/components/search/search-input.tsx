'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'What do you want to listen to?',
  className,
}: SearchInputProps) {
  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full bg-neutral-800 px-4 py-2.5 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white"
      />
    </div>
  );
}
