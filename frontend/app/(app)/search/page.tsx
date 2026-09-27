'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Compass, Music2, X } from 'lucide-react';
import { SearchInput } from '@/components/search/search-input';
import { SearchResults } from '@/components/search/search-results';
import { useSearchQuery } from '@/hooks/use-search';
import { useDebounce } from '@/hooks/use-debounce';
import { useCategories } from '@/hooks/use-music';
import { useRecentSearches, RecentSearch } from '@/hooks/use-recent-searches';
import { CategoryCard } from '@/components/music/category-card';
import { CategoryCardSkeleton } from '@/components/music/category-card-skeleton';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { usePlayerStore } from '@/stores/player-store';
import { cn } from '@/lib/utils/cn';

const RECENT_HREF: Record<Exclude<RecentSearch['type'], 'song'>, string> = { artist: '/artists/', album: '/albums/', playlist: '/playlists/' };
const RECENT_LABEL: Record<RecentSearch['type'], string> = { song: 'Song', artist: 'Artist', album: 'Album', playlist: 'Playlist' };

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const recents = useRecentSearches();

  const urlQuery = searchParams.get('q') || '';
  const [inputValue, setInputValue] = React.useState(urlQuery);

  // Every query this page itself wrote to the URL. The URL write lands a
  // moment after the debounce fires — by then you've often typed more — so
  // copying it back into the box used to eat your latest letters (and any
  // trailing space, since the URL copy is trimmed). Only a URL change we
  // didn't make (arriving from a link) should overwrite what's typed.
  const writtenQueries = React.useRef(new Set<string>([urlQuery]));
  React.useEffect(() => {
    if (!writtenQueries.current.has(urlQuery)) setInputValue(urlQuery);
  }, [urlQuery]);

  const activeQuery = useDebounce(inputValue, 300).trim();

  // Keep the URL in sync with the debounced query (shareable/reload-safe).
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeQuery === (params.get('q') || '')) return;
    if (activeQuery) params.set('q', activeQuery);
    else params.delete('q');
    writtenQueries.current.add(activeQuery);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [activeQuery, pathname, router, searchParams]);

  const search = useSearchQuery(activeQuery);
  const { data: categories, isLoading: isCategoriesLoading } = useCategories();

  // Still typing, or the new query's results haven't landed yet.
  const isSearching = inputValue.trim() !== activeQuery || (Boolean(activeQuery) && search.isFetching);

  const openRecent = (item: RecentSearch) => {
    recents.add(item); // bump to the top
    if (item.type === 'song' && item.track) playTrack(item.track, [item.track]);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col items-center sm:items-start space-y-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Search</h1>
        <SearchInput value={inputValue} onChange={setInputValue} isSearching={isSearching} autoFocus={!urlQuery} />
      </div>

      {activeQuery ? (
        <SearchResults
          query={activeQuery}
          results={search.data || null}
          isLoading={search.isLoading}
          isError={search.isError}
          error={search.error as Error | null}
          onRetry={search.refetch}
          onClear={() => setInputValue('')}
          onPick={recents.add}
        />
      ) : (
        <>
          {recents.items.length > 0 && (
            <section className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Recent searches</h2>
                <button type="button" onClick={recents.clear} className="text-xs sm:text-sm font-semibold text-neutral-400 hover:text-white transition-colors">
                  Clear all
                </button>
              </div>
              <ul className="space-y-1">
                {recents.items.map((item) => {
                  const row = (
                    <>
                      <div className={cn('relative h-12 w-12 shrink-0 overflow-hidden bg-neutral-800', item.type === 'artist' ? 'rounded-full' : 'rounded-md')}>
                        <ImageWithFallback src={item.image} alt="" fallbackIcon={<Music2 className="h-5 w-5 text-neutral-600" />} fill sizes="48px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                        <p className="truncate text-xs text-neutral-400">
                          {item.type === 'song' || item.type === 'album' ? `${RECENT_LABEL[item.type]} • ${item.subtitle}` : RECENT_LABEL[item.type]}
                        </p>
                      </div>
                    </>
                  );
                  const rowClass = 'flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 hover:bg-white/[0.06] transition-colors';
                  return (
                    <li key={`${item.type}-${item.id}`} className="flex items-center gap-1">
                      {item.type === 'song' ? (
                        <button type="button" onClick={() => openRecent(item)} className={rowClass}>
                          {row}
                        </button>
                      ) : (
                        <Link href={`${RECENT_HREF[item.type]}${item.id}`} onClick={() => openRecent(item)} className={rowClass}>
                          {row}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => recents.remove(item)}
                        aria-label={`Remove ${item.title} from recent searches`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-brand-400" />
              <h2 className="text-xl font-bold tracking-tight text-white">Browse Categories</h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400">Explore genres, mood playlists, and regional sounds while you search.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {isCategoriesLoading
                ? Array.from({ length: 6 }).map((_, i) => <CategoryCardSkeleton key={`cat-skel-${i}`} />)
                : categories?.map((category) => <CategoryCard key={category.id} category={category} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-32 rounded bg-neutral-800 animate-pulse" />
          <div className="h-12 w-full max-w-2xl rounded-full bg-neutral-900 animate-pulse" />
        </div>
      }
    >
      <SearchPageContent />
    </React.Suspense>
  );
}
