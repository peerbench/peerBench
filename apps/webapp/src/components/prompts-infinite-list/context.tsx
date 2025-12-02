import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react";
import {
  Filters,
  usePromptSearchFiltersContext,
} from "../prompt-search-filters/context";
import { PromptSearchFiltersProps } from "../prompt-search-filters";
import { useDebouncedCallback } from "@/lib/hooks/use-debounce";
import { useRouter, useSearchParams } from "next/navigation";
import { promptFiltersSchema } from "@/validation/api/prompt-filters";
import { z } from "zod";
import { PromptType } from "peerbench";

export interface ComponentContextType {
  isFilterFixed: (
    key: keyof NonNullable<PromptSearchFiltersProps["fixedFilters"]>
  ) => boolean;
  search: string;
  setSearch: (search: string) => void;

  /**
   * Converts the given filters to an object that can be passed to
   * the API call.
   */
  convertFiltersToApiParams: (
    filters: Filters
  ) => z.infer<typeof promptFiltersSchema>;
}

const ComponentContext = createContext<ComponentContextType | null>(null);

export interface ComponentContextProviderProps {
  children: ReactNode;
}

export function ComponentContextProvider({
  children,
}: ComponentContextProviderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const promptFiltersCtx = usePromptSearchFiltersContext();
  const [search, setSearchState] = useState<string>(
    searchParams.get("search") ?? ""
  );

  const isFilterFixed = useCallback(
    (
      key: keyof NonNullable<PromptSearchFiltersProps["fixedFilters"]>
    ): boolean => {
      return promptFiltersCtx.fixedFilters
        ? promptFiltersCtx.fixedFilters[key] !== undefined
        : false;
    },
    [promptFiltersCtx.fixedFilters]
  );

  const setSearch = useDebouncedCallback((search: string) => {
    setSearchState(search);

    const params = new URLSearchParams(searchParams);
    params.set("search", search);

    if (search) {
      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
    } else {
      params.delete("search");
      router.replace(`?${params.toString()}`, {
        scroll: false,
      });
    }
  }, 500);

  const convertFiltersToApiParams = useCallback(
    (filters: Filters) => {
      const promptSetId: number[] = [];
      if (
        promptFiltersCtx.fixedFilters?.promptSetId !== undefined &&
        promptFiltersCtx.fixedFilters.promptSetId !== null
      ) {
        promptSetId.push(promptFiltersCtx.fixedFilters.promptSetId);
      } else if (
        filters.promptSetId?.value?.value !== undefined &&
        filters.promptSetId.value.value !== null
      ) {
        promptSetId.push(filters.promptSetId.value.value);
      }

      return promptFiltersSchema.parse({
        promptSetId,
        type: filters.type.value?.map((type) => type.value as PromptType),

        // All the searches are done for ID and the content so if there is
        // a search param is given, we set the searchId param to the same value
        searchId: search !== "" ? search : undefined,
        search: search !== "" ? search : undefined,

        tags: filters.tags?.value?.map((tag) => tag.value),
        uploaderId: filters.uploaderId?.value || undefined,
        status: filters.status?.value?.value || undefined,
        reviewedByUserId: filters.reviewedByUserId?.value || undefined,
        excludeReviewedByUserId:
          filters.excludeReviewedByUserId?.value || undefined,
        minScoreCount: filters.minScoreCount?.value || undefined,
        maxScoreCount: filters.maxScoreCount?.value || undefined,
        minBadScoreCount: filters.minBadScoreCount?.value || undefined,
        maxBadScoreCount: filters.maxBadScoreCount?.value || undefined,
        badScoreThreshold: filters.badScoreThreshold?.value || undefined,
        minGoodScoreCount: filters.minGoodScoreCount?.value || undefined,
        maxGoodScoreCount: filters.maxGoodScoreCount?.value || undefined,
        goodScoreThreshold: filters.goodScoreThreshold?.value || undefined,
        minReviewsCount: filters.minReviewsCount?.value || undefined,
        maxReviewsCount: filters.maxReviewsCount?.value || undefined,
        minPositiveReviewsCount:
          filters.minPositiveReviewsCount?.value || undefined,
        maxPositiveReviewsCount:
          filters.maxPositiveReviewsCount?.value || undefined,
        minNegativeReviewsCount:
          filters.minNegativeReviewsCount?.value || undefined,
        maxNegativeReviewsCount:
          filters.maxNegativeReviewsCount?.value || undefined,
        maxAvgScore: filters.maxAvgScore?.value || undefined,
        minAvgScore: filters.minAvgScore?.value || undefined,
        modelSlugs: filters.modelSlugs?.value || undefined,
        maxPromptAgeDays: filters.maxPromptAgeDays?.value?.value || undefined,
        maxGapToFirstResponse:
          filters.maxGapToFirstResponse?.value || undefined,
        isRevealed:
          filters.isRevealed?.value?.value !== undefined
            ? filters.isRevealed.value?.value
            : undefined,
      });
    },
    [promptFiltersCtx.fixedFilters, search]
  );

  return (
    <ComponentContext.Provider
      value={{
        search,
        isFilterFixed,
        setSearch,
        convertFiltersToApiParams,
      }}
    >
      {children}
    </ComponentContext.Provider>
  );
}

export function useComponentContext() {
  const context = useContext(ComponentContext);
  if (!context) {
    throw new Error(
      "useComponentContext must be used inside ComponentContextProvider"
    );
  }
  return context;
}
