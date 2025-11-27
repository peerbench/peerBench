"use client";

import { PromptCard } from "./prompt-card";
import { useCallback, useMemo } from "react";
import { useComponentContext } from "../context";
import LoadingSpinner from "@/components/loading-spinner";
import { usePromptSearchFiltersContext } from "@/components/prompt-search-filters/context";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { PromptItem, usePromptAPI } from "@/lib/hooks/use-prompt-api";
import { useInfinitePrompts } from "@/lib/react-query/use-infinite-prompts";
import { errorMessage } from "@/utils/error-message";
import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { QK_PROMPTS } from "@/lib/react-query/query-keys";
import { PaginatedResponse } from "@/types/db";
import { LucideLoader2 } from "lucide-react";

export function Results() {
  const { getPrompts } = usePromptAPI();
  const { filters } = usePromptSearchFiltersContext();
  const { convertFiltersToApiParams } = useComponentContext();
  const debouncedFilters = useDebounce(filters, 500);
  const queryClient = useQueryClient();
  const queryParams = useMemo(
    () => ({
      ...convertFiltersToApiParams(debouncedFilters),
      orderBy: ["createdAt_desc"],
    }),
    [convertFiltersToApiParams, debouncedFilters]
  );

  const {
    data: prompts,
    isLoading,
    isFetchingNextPage,
    isReachingEnd,
    refetch,
    error,
    loadingRef,
  } = useInfinitePrompts(queryParams, {
    enableInfiniteScroll: true,
    autoLoadNextPage: false,
  });

  const handleIncludingPromptSetUpdated = useCallback(
    async (promptId: string) => {
      if (prompts.length === 0) return;

      const newPrompt = await getPrompts({
        searchId: promptId,
        page: 1,
        pageSize: 1,
      }).then((result) => result.data[0]!);

      if (!newPrompt) {
        console.error("Prompt not found after update");
        return;
      }

      // TODO: Use server-state pattern where the API call returns the updated entity
      // Update the local cache with the new updated Prompt data
      queryClient.setQueryData(
        [QK_PROMPTS, queryParams],
        (prev: InfiniteData<PaginatedResponse<PromptItem>>) => {
          return {
            ...prev,
            pages: prev.pages.map((page) => ({
              ...page,
              data: page.data.map((prompt) => {
                if (prompt.id === promptId) {
                  return newPrompt;
                }

                return prompt;
              }),
            })),
          };
        }
      );
    },
    [getPrompts, queryParams, queryClient, prompts]
  );

  // Show loading spinner for initial load
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner position="block" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-500">
        <p className="text-lg font-medium">Error loading prompts</p>
        <p className="text-sm text-gray-600 mt-2">
          {errorMessage(error) || "Something went wrong. Please try again."}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show empty state
  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <p className="text-lg">No prompts found</p>
        <p className="text-sm">Try adjusting your search criteria</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {prompts?.map((prompt) => (
        <PromptCard
          key={prompt.id}
          {...prompt}
          tags={[
            // Get rid of duplicates via using a Set
            ...new Set([
              ...(prompt.metadata?.tags || []),
              ...(prompt.metadata?.articleTags || []),
              ...(prompt.metadata?.generatorTags || []),
              ...(prompt.metadata?.sourceTags || []),
            ]),
          ]}
          onIncludingPromptSetUpdated={() =>
            handleIncludingPromptSetUpdated(prompt.id)
          }
        />
      ))}

      <div ref={loadingRef} className="flex justify-center py-4">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-gray-500">
            <LucideLoader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading more prompts...</span>
          </div>
        )}
        {isReachingEnd && prompts.length > 0 && (
          <p className="text-sm text-gray-500">No more prompts to load</p>
        )}
      </div>
    </div>
  );
}
