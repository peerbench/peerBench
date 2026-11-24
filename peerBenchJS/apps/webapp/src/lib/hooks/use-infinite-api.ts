import { useCallback, useEffect, useMemo, useRef } from "react";
import useSWRInfinite, {
  SWRInfiniteConfiguration,
  SWRInfiniteKeyedMutator,
} from "swr/infinite";
import { PaginatedResponse } from "@/types/db";

export interface UseInfiniteAPIOptions<TData, TParams> {
  /**
   * Function that generates the SWR key for each page.
   * Return null to stop fetching more pages.
   */
  getKey: (
    pageIndex: number,
    previousPageData: PaginatedResponse<TData> | null
  ) => TParams | null;

  /**
   * Function that fetches data for a given key.
   * Should return a promise that resolves to a paginated response.
   */
  fetcher: (key: TParams) => Promise<PaginatedResponse<TData>>;

  /**
   * SWR configuration options to pass to useSWRInfinite
   */
  swrConfig?: SWRInfiniteConfiguration;

  /**
   * Whether to enable infinite scroll with intersection observer (default: true)
   */
  enableInfiniteScroll?: boolean;

  /**
   * Whether to automatically load the next page when data is available (default: false)
   */
  autoLoadNextPage?: boolean;

  /**
   * Intersection observer threshold for infinite scroll (default: 0.1)
   * A value of 0.1 means trigger when 10% of the element is visible
   */
  scrollThreshold?: number;
}

export interface UseInfiniteAPIReturn<TData> {
  /** Flattened array of all data from all pages */
  data: TData[];
  /** Raw paginated data array from SWR */
  rawData: PaginatedResponse<TData>[] | undefined;

  /** Whether the first page is currently loading */
  isLoading: boolean;
  /** Whether any page is currently validating */
  isValidating: boolean;
  /** Whether additional pages are currently loading */
  isLoadingMore: boolean;
  /** Whether the first page is loading and no data is available yet */
  isFirstPageLoading: boolean;

  /** Whether there are more pages available to load */
  hasNextPage: boolean;
  /** Whether we've reached the end of available data */
  isReachingEnd: boolean;
  /** Whether the first page returned empty data */
  isEmpty: boolean;
  /** Total count of items */
  totalCount: number | undefined;

  /** Function to manually load the next page */
  loadMore: () => void;
  /** SWR mutate function for cache management */
  mutate: SWRInfiniteKeyedMutator<PaginatedResponse<TData>[]>;
  /** Function to manually set the page */
  setSize: (size: number) => void;

  /** Ref to attach to a loading element for infinite scroll */
  loadingRef: React.RefObject<HTMLDivElement | null>;

  /** Any error that occurred during fetching */
  error: any;
}

/**
 * A generic hook for infinite scrolling with SWR
 *
 * @example
 * ```tsx
 * const { data, isLoading, loadMore, loadingRef } = useInfiniteAPI({
 *   getKey: (pageIndex, previousPageData) => {
 *     if (previousPageData && !previousPageData.pagination.hasNext) return null;
 *     return { query: { page: pageIndex + 1, pageSize: 10, promptId } };
 *   },
 *   fetcher: (key) => getResponses(key.query),
 *   enableInfiniteScroll: true,
 *   autoLoadNextPage: false,
 * });
 * ```
 */
export function useInfiniteAPI<TData, TParams>({
  getKey,
  fetcher,
  swrConfig = {},
  enableInfiniteScroll = true,
  autoLoadNextPage = false,
  scrollThreshold = 0.1,
}: UseInfiniteAPIOptions<TData, TParams>): UseInfiniteAPIReturn<TData> {
  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite(getKey as any, fetcher as any, {
      ...swrConfig,
    });

  // Flatten all pages of data
  const flattenedData: TData[] = useMemo(() => {
    return data ? data.flatMap((page) => page.data || []) : [];
  }, [data]);

  // Get pagination info from the last page
  const lastPage = data?.[data.length - 1];
  const hasNextPage = lastPage?.pagination.hasNext === true;
  const isLoadingMore = isValidating && size > 1;
  const totalCount = lastPage?.pagination.totalCount;

  const isEmpty = data?.[0]?.data?.length === 0;
  const isFirstPageLoading = isLoading && flattenedData.length === 0;
  const isReachingEnd = isEmpty || !hasNextPage;

  // Infinite scroll functionality
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);
  const loadingRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isReachingEnd) {
      setSize(size + 1);
    }
  }, [isLoadingMore, isReachingEnd, setSize, size]);

  // Auto-load next page when data is available
  useEffect(() => {
    if (
      autoLoadNextPage &&
      data &&
      data.length > 0 &&
      hasNextPage &&
      !isLoadingMore &&
      !isValidating
    ) {
      setSize(size + 1);
    }
  }, [
    autoLoadNextPage,
    data,
    hasNextPage,
    isLoadingMore,
    isValidating,
    size,
    setSize,
  ]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!enableInfiniteScroll) return;

    const element = loadingRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore && !isReachingEnd) {
          loadMore();
        }
      },
      { threshold: scrollThreshold }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    enableInfiniteScroll,
    loadMore,
    isLoadingMore,
    isReachingEnd,
    scrollThreshold,
  ]);

  return {
    // Data
    data: flattenedData,
    rawData: data,

    // Loading states
    isLoading,
    isValidating,
    isLoadingMore,
    isFirstPageLoading,

    // Pagination
    hasNextPage,
    isReachingEnd,
    isEmpty,
    totalCount,

    // Actions
    loadMore,
    mutate,
    setSize,

    // Refs
    loadingRef,

    // Error
    error,
  };
}
