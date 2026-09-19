'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ChipOption {
  label: string;
  value: string;
}

interface ChipGroupProps {
  options: (ChipOption | string)[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  helperText?: string;
  className?: string;
}

export function ChipGroup({
  options,
  selected,
  onChange,
  label,
  helperText,
  className,
}: ChipGroupProps) {
  // Normalize options to { label, value }
  const normalizedOptions: ChipOption[] = React.useMemo(() => {
    return options.map((opt) =>
      typeof opt === 'string' ? { label: opt, value: opt.toLowerCase() } : opt
    );
  }, [options]);

  const toggleOption = (val: string) => {
    const isSelected = selected.some((s) => s.toLowerCase() === val.toLowerCase());
    if (isSelected) {
      onChange(selected.filter((s) => s.toLowerCase() !== val.toLowerCase()));
    } else {
      onChange([...selected, val]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {(label || selected.length > 0) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              {label}
            </label>
          )}
          {selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-accent-400">
                {selected.length} selected
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {normalizedOptions.map((opt) => {
          const isSelected = selected.some(
            (s) => s.toLowerCase() === opt.value.toLowerCase()
          );
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleOption(opt.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all select-none border',
                isSelected
                  ? 'bg-accent-600 border-accent-500 text-white shadow-sm shadow-accent-950/50 hover:bg-accent-500'
                  : 'bg-neutral-900/90 border-white/10 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              )}
            >
              {isSelected && <Check className="h-3 w-3 shrink-0 stroke-[2.5]" />}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {helperText && (
        <p className="text-[11px] text-neutral-500">{helperText}</p>
      )}
    </div>
  );
}
