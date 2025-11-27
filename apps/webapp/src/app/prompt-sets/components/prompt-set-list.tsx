"use client";

import { useInfinitePromptSets } from "@/lib/react-query/use-infinite-prompt-sets";
import { usePageContext } from "../context";
import { PromptSetCardSkeletonCard } from "./prompt-set-card-skeleton";
import { PromptSetCard } from "./prompt-set-card";
import { LucideLoader2 } from "lucide-react";
import { errorMessage } from "@/utils/error-message";
import { useMemo } from "react";
import { useAuth } from "@/components/providers/auth";
import { useDebounce } from "@/lib/hooks/use-debounce";

export function PromptSetList() {
  const user = useAuth();
  const { filters } = usePageContext();
  const apiParams = useDebounce(
    useMemo(() => {
      return {
        search: filters.search,
        ownerId: filters.createdByMe ? user?.id : undefined,
        visibility: filters.visibility?.value,
        categories: filters.categories.map((v) => v.value),
        tags: filters.tags.map((v) => v.value),
        orderBy: filters.orderBy?.value,
      };
    }, [filters, user?.id]),
    500
  );

  const {
    data: promptSets,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    isEmpty,
    error,
    loadingRef,
  } = useInfinitePromptSets(apiParams);

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-500">
        <p className="text-lg font-medium">Error loading Benchmarks</p>
        <p className="text-sm text-gray-600 mt-2">
          {errorMessage(error) || "Something went wrong. Please try again."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return isLoading ? (
    // Show skeleton cards while loading first page
    Array.from({ length: 10 }).map((_, index) => (
      <PromptSetCardSkeletonCard key={`skeleton-${index}`} />
    ))
  ) : (
    <>
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <p className="text-lg">No Benchmarks found</p>
        </div>
      )}
      {promptSets?.map((promptSet) => (
        <PromptSetCard key={promptSet.id} item={promptSet} />
      ))}

      {/* Infinite scroll trigger */}
      <div ref={loadingRef} className="flex justify-center py-4">
        <div className="flex flex-col justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-gray-500">
              <LucideLoader2 size={20} className="animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
          {!hasNextPage && promptSets.length > 0 && (
            <p className="text-gray-500 text-sm">No more benchmarks to load</p>
          )}
        </div>
      </div>
    </>
  );
}
