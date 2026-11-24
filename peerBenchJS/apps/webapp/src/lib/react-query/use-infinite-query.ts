import {
  QueryFunction,
  QueryKey,
  useInfiniteQuery as useReactInfiniteQuery,
  InfiniteData,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type { PaginatedResponse } from "@/types/db";

export interface UseInfiniteQueryParams<TData> {
  /**
   * Whether to enable infinite scroll with intersection observer
   * @default true
   */
  enableInfiniteScroll?: boolean;

  /**
   * Whether to automatically load the next page when data is available
   * @default false
   */
  autoLoadNextPage?: boolean;

  /**
   * Intersection observer threshold for infinite scroll (default: 0.1)
   * A value of 0.1 means trigger when 10% of the element is visible
   * @default 0.1
   */
  scrollThreshold?: number;

  queryKey: QueryKey;
  queryFn: QueryFunction<PaginatedResponse<TData>, QueryKey, number>;

  initialPageParam?: number;
}

export interface UseInfiniteQueryReturn<TData> {
  /**
   * Flattened array of all data from all pages
   */
  data: TData[];

  /**
   * Raw paginated data from React Query's infinite query
   */
  rawData: InfiniteData<PaginatedResponse<TData>> | undefined;

  /**
   * Function to manually load the next page
   */
  fetchNextPage: () => void;

  /**
   * Whether the first page is currently loading
   */
  isLoading: boolean;

  /**
   * Whether the query is currently refetching
   */
  isRefetching: boolean;

  /**
   * Whether additional pages are currently loading
   */
  isFetchingNextPage: boolean;

  /**
   * Whether we've reached the end of available data
   */
  isReachingEnd: boolean;

  /**
   * Whether the first page returned empty data
   */
  isEmpty: boolean;

  /**
   * Whether there are more pages available to load
   */
  hasNextPage: boolean | undefined;

  /**
   * Total count of items from the last page
   */
  totalCount: number | undefined;

  /**
   * Ref to attach to a loading element for infinite scroll
   */
  loadingRef: React.RefObject<HTMLDivElement | null>;

  /**
   * Any error that occurred during fetching
   */
  error: unknown;

  /**
   * Refetch the query
   */
  refetch: () => void;
}

export function useInfiniteQuery<TData>({
  enableInfiniteScroll = true,
  autoLoadNextPage = false,
  scrollThreshold = 0.1,
  queryKey,
  queryFn,
  initialPageParam = 1,
}: UseInfiniteQueryParams<TData>): UseInfiniteQueryReturn<TData> {
  const {
    data,
    error,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    isRefetching,
    refetch,
    fetchNextPage,
  } = useReactInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam,
    getNextPageParam: (lastPage) => {
      return lastPage?.pagination.hasNext
        ? lastPage?.pagination.page + 1
        : undefined;
    },
  });

  const flattenedData = useMemo(
    () => data?.pages.flatMap((page) => page.data) || [],
    [data]
  );
  const lastPage = data?.pages[data.pages.length - 1];
  const isEmpty = flattenedData.length === 0;
  const totalCount = lastPage?.pagination.totalCount;
  const isReachingEnd = isEmpty || !hasNextPage;

  // Infinite scroll functionality
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!enableInfiniteScroll) return;

    const element = loadingRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !isFetchingNextPage &&
          !isReachingEnd
        ) {
          fetchNextPage();
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
    fetchNextPage,
    isFetchingNextPage,
    isReachingEnd,
    scrollThreshold,
  ]);

  // Auto-load next page when data is available
  useEffect(() => {
    if (
      autoLoadNextPage &&
      data &&
      data.pages.length > 0 &&
      hasNextPage &&
      !isFetchingNextPage &&
      !isRefetching
    ) {
      fetchNextPage();
    }
  }, [
    autoLoadNextPage,
    data,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    fetchNextPage,
  ]);

  return {
    data: flattenedData,
    rawData: data,

    fetchNextPage,
    refetch,

    isLoading,
    isRefetching,
    isFetchingNextPage,
    isReachingEnd,
    isEmpty,
    hasNextPage,

    totalCount,
    loadingRef,
    error,
  };
}
