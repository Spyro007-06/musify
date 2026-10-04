'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useActiveMood, useSetMood } from '@/hooks/use-user';
import { MOODS } from '@/lib/constants/moods';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';

/**
 * One tap to say how you feel. The pick is saved as a mood check-in and
 * steers the recommendations row below it for a few hours; tapping the
 * selected mood again clears it.
 */
export function MoodCheckIn() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: activeMood } = useActiveMood();
  const setMood = useSetMood();

  if (!isAuthenticated) return null;

  return (
    <section aria-labelledby="mood-check-in-heading" className="space-y-2">
      <h2 id="mood-check-in-heading" className="text-sm font-semibold text-neutral-300">
        How are you feeling?
      </h2>
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {MOODS.map((mood) => {
          const selected = activeMood === mood.id;
          return (
            <button
              key={mood.id}
              type="button"
              aria-pressed={selected}
              disabled={setMood.isPending}
              onClick={() =>
                setMood.mutate(selected ? null : mood.id, {
                  onError: () => toast.error("Couldn't save your mood. Try again."),
                })
              }
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-60',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                selected
                  ? cn('border-white/20 bg-gradient-to-r text-white shadow-lg', mood.gradient)
                  : 'border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10'
              )}
            >
              {mood.shortName}
            </button>
          );
        })}
      </div>
    </section>
  );
}
