"use client";

import useSWRInfinite from "swr/infinite";
import {
  RequestQueryParams,
  ResponseType,
} from "@/app/api/v1/test-results/get";
import { SWR_GET_TEST_RESULTS_INFINITE } from "@/lib/swr/keys";
import { apiFetcher } from "../swr/api-fetcher";
import { ReviewOpinion } from "@/types/review";

export function useTestResults(
  params: RequestQueryParams = {},
  fetchOnMount = true
) {
  const { pageSize = 10, ...filters } = params;

  const getKey = (pageIndex: number, previousPageData: ResponseType | null) => {
    // If we've reached the end, return null to stop fetching
    if (previousPageData && !previousPageData.pagination.hasNext) {
      return null;
    }

    return SWR_GET_TEST_RESULTS_INFINITE(pageIndex, filters, pageSize);
  };

  const { data, error, isLoading, size, setSize, mutate, isValidating } =
    useSWRInfinite<ResponseType>(getKey, apiFetcher, {
      revalidateFirstPage: false,
      revalidateAll: false,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnMount: fetchOnMount,
    });

  // Flatten all pages of data
  const testResults = data ? data.flatMap((page) => page.data) : [];

  // Get pagination info from the last page
  const pagination =
    data && data.length > 0 ? data[data.length - 1]!.pagination : null;

  // Check if we can load more
  const hasNextPage = pagination?.hasNext ?? false;

  // Check if we're loading more (not the initial load)
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  // Check if we're reaching the end
  const isReachingEnd = !hasNextPage;

  return {
    testResults,
    pagination,
    error,
    isLoading: isLoading && size === 0, // Only show loading for initial load
    isLoadingMore,
    isReachingEnd,
    hasNextPage,

    mutate,
    isValidating,
    totalCount: pagination?.totalCount ?? 0,

    /**
     * Loads more data if available.
     */
    loadMore: () => {
      if (!isLoadingMore && !isReachingEnd) {
        setSize(size + 1);
      }
    },

    /**
     * Locally updates the cache without fetching test results again from the server.
     */
    updateTestResultReview: async (
      testResultId: number,
      reviewData: {
        id?: number;
        opinion?: ReviewOpinion;
        comment?: string;
        createdAt?: string;
      },
      reviewType:
        | "userPromptReview"
        | "userTestResultReview" = "userPromptReview"
    ) => {
      mutate(
        (currentData) => {
          if (!currentData) return currentData;

          return currentData.map((page) => ({
            ...page,
            data: page.data.map((testResult) => {
              if (testResult.id === testResultId) {
                return {
                  ...testResult,
                  [reviewType]: {
                    ...testResult[reviewType],
                    ...reviewData,
                  },
                };
              }
              return testResult;
            }),
          }));
        },
        { revalidate: false }
      );
    },
  };
}
