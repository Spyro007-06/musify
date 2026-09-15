import * as React from 'react';
import { RecommendationSection as RecommendationSectionType } from '@/types/recommendations';
import { SectionHeader } from '@/components/music/section-header';
import { HorizontalScroller } from '@/components/music/horizontal-scroller';
import { TrackCard } from '@/components/music/track-card';
import { Track } from '@/types/track';
import { cn } from '@/lib/utils/cn';

export interface RecommendationSectionProps {
  section: RecommendationSectionType;
  className?: string;
}

export function RecommendationSection({ section, className }: RecommendationSectionProps) {
  return (
    <section className={cn('space-y-2', className)}>
      <SectionHeader title={section.title} subtitle={section.subtitle} />
      <HorizontalScroller>
        {section.items.map((item, idx) => (
          <div key={item.id || idx} className="w-44 shrink-0">
            <TrackCard track={item as Track} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
