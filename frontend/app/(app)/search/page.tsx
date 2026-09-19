'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SearchInput } from '@/components/search/search-input';
import { SearchResults } from '@/components/search/search-results';
import { useSearchQuery } from '@/hooks/use-search';
import { useDebounce } from '@/hooks/use-debounce';
import { useCategories } from '@/hooks/use-music';
import { CategoryCard } from '@/components/music/category-card';
import { CategoryCardSkeleton } from '@/components/music/category-card-skeleton';
import { Compass } from 'lucide-react';

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get('q') || '';
  const [inputValue, setInputValue] = React.useState(urlQuery);

  // Sync state if URL search query changes (e.g. Back/Forward button)
  React.useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  // Debounce typed text for searching (300ms)
  const debouncedInput = useDebounce(inputValue, 300);

  // Active query to search: either directly submitted or debounced
  const activeQuery = debouncedInput.trim();

  // Keep URL query in sync when debounced query changes
  React.useEffect(() => {
    const currentParams = new URLSearchParams(searchParams.toString());
    const currentQ = currentParams.get('q') || '';

    if (activeQuery !== currentQ) {
      if (activeQuery) {
        currentParams.set('q', activeQuery);
      } else {
        currentParams.delete('q');
      }
      const newQueryString = currentParams.toString();
      const newUrl = newQueryString ? `${pathname}?${newQueryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [activeQuery, pathname, router, searchParams]);

  // Full search query
  const {
    data: searchResults,
    isLoading: isSearchLoading,
    isError: isSearchError,
    error: searchError,
    refetch: refetchSearch,
  } = useSearchQuery(activeQuery);

  // Initial landing state categories
  const {
    data: categories,
    isLoading: isCategoriesLoading,
  } = useCategories();

  const handleSearchSubmit = (submittedQuery: string) => {
    setInputValue(submittedQuery);
    const currentParams = new URLSearchParams(searchParams.toString());
    if (submittedQuery.trim()) {
      currentParams.set('q', submittedQuery.trim());
    } else {
      currentParams.delete('q');
    }
    const newQueryString = currentParams.toString();
    const newUrl = newQueryString ? `${pathname}?${newQueryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const handleClear = () => {
    setInputValue('');
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Search Input Header */}
      <div className="flex flex-col items-center sm:items-start space-y-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Search
        </h1>
        <SearchInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSearchSubmit}
          placeholder="What do you want to play?"
          autoFocus={!urlQuery}
        />
      </div>

      {/* Main Content Area: Search Results OR Landing Categories */}
      {activeQuery ? (
        <SearchResults
          query={activeQuery}
          results={searchResults || null}
          isLoading={isSearchLoading}
          isError={isSearchError}
          error={searchError as Error | null}
          onRetry={refetchSearch}
          onClear={handleClear}
        />
      ) : (
        /* Initial Landing State: Browse All Categories */
        <section className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-brand-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Browse Categories
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400">
            Explore genres, mood playlists, and regional sounds while you search.
          </p>

          {isCategoriesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <CategoryCardSkeleton key={`cat-skel-${i}`} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories?.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          )}
        </section>
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
