"use client";

import { PromptStatus, PromptStatuses } from "@/database/types";
import { useDataAPI } from "@/lib/hooks/use-data-api";
import { useDebouncedCallback } from "@/lib/hooks/use-debounce";
import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type SelectOption<T> = {
  value: T;
  label: string;
};

type Filter<TValue> = {
  value: TValue;
  defaultValue: TValue;
  loadValueAsync?: () => Promise<TValue | undefined>;
  isValueLoading?: boolean;
  convertToSearchParamValue?: (value: TValue) => string | string[] | undefined;
};
export type Filters = {
  promptSetId: Filter<SelectOption<number> | null>;
  tags: Filter<readonly SelectOption<string>[]>;
  type: Filter<readonly SelectOption<string>[]>;
  uploaderId: Filter<string>;
  status: Filter<SelectOption<PromptStatus> | null>;
  reviewedByUserId: Filter<string>;
  excludeReviewedByUserId: Filter<string>;
  minAvgScore: Filter<string>;
  maxAvgScore: Filter<string>;
  minScoreCount: Filter<string>;
  maxScoreCount: Filter<string>;
  minBadScoreCount: Filter<string>;
  maxBadScoreCount: Filter<string>;
  minGoodScoreCount: Filter<string>;
  maxGoodScoreCount: Filter<string>;
  badScoreThreshold: Filter<string>;
  goodScoreThreshold: Filter<string>;
  minReviewsCount: Filter<string>;
  maxReviewsCount: Filter<string>;
  minPositiveReviewsCount: Filter<string>;
  maxPositiveReviewsCount: Filter<string>;
  minNegativeReviewsCount: Filter<string>;
  maxNegativeReviewsCount: Filter<string>;
  modelSlugs: Filter<string>;
  maxPromptAgeDays: Filter<SelectOption<string> | null>;
  maxGapToFirstResponse: Filter<string>;
  isRevealed: Filter<SelectOption<string> | null>;
};

export type PromptSearchFiltersContextType = {
  filters: Filters;
  fixedFilters?: {
    promptSetId?: number | null;
  };
  updateFilters: <
    T extends Partial<{
      [K in keyof Filters]: Filters[K]["value"];
    }>,
  >(
    value: T,
    updateSearchParams?: boolean
  ) => void;
  updateFilter: <K extends keyof Filters>(
    key: K,
    value: Partial<Filter<Filters[K]["value"]>>,
    updateSearchParams?: boolean
  ) => void;
  clearFilters: () => void;
  isAnyFilterApplied: boolean;
};

export const PromptSearchFiltersContext =
  createContext<PromptSearchFiltersContextType | null>(null);

export interface PromptSearchFiltersContextProviderProps {
  children: React.ReactNode;
  fixedFilters?: PromptSearchFiltersContextType["fixedFilters"];
  onFiltersChange?: (filters: Filters) => void;
}

export function PromptSearchFiltersContextProvider({
  children,
  fixedFilters,
  onFiltersChange,
}: PromptSearchFiltersContextProviderProps) {
  const { getPromptSetFilters } = useDataAPI();
  const router = useRouter();
  const urlSearchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>({
    promptSetId: {
      value: null,
      defaultValue: null,
      loadValueAsync: async () => {
        const id = Number(
          fixedFilters?.promptSetId ??
            urlSearchParams.get("promptSetId") ??
            undefined
        );
        if (isNaN(id)) {
          return null;
        }

        return await getPromptSetFilters({
          page: 1,
          pageSize: 1,
          id,
        })
          .then((response) => {
            const [promptSet] = response.data;
            if (promptSet) {
              return {
                value: promptSet.id,
                label: promptSet.title,
              };
            }

            return null;
          })
          .catch((err) => {
            console.error("Error loading Benchmark:", err);
            return null;
          });
      },
      convertToSearchParamValue: (option) =>
        option ? option?.value.toString() : undefined,
    },
    tags: {
      defaultValue: [],
      value: urlSearchParams.getAll("tags").map((tag) => ({
        value: tag,
        label: tag,
      })),
      convertToSearchParamValue: (value) => value.map((v) => v.value),
    },
    type: {
      defaultValue: [],
      value: urlSearchParams.getAll("type").map((type) => ({
        value: type,
        label: type,
      })),
      convertToSearchParamValue: (value) => value.map((v) => v.value),
    },

    uploaderId: {
      defaultValue: "",
      value: urlSearchParams.get("uploaderId") ?? "",
    },
    status: {
      defaultValue: { value: PromptStatuses.included, label: "Included" },
      value: urlSearchParams.get("status")
        ? {
            value: urlSearchParams.get("status")! as PromptStatus,
            label:
              urlSearchParams.get("status")! === PromptStatuses.included
                ? "Included"
                : "Excluded",
          }
        : { value: PromptStatuses.included, label: "Included" },
      convertToSearchParamValue: (option) =>
        option ? option?.value.toString() : undefined,
    },
    reviewedByUserId: {
      defaultValue: "",
      value: urlSearchParams.get("reviewedByUserId") ?? "",
    },
    excludeReviewedByUserId: {
      defaultValue: "",
      value: urlSearchParams.get("excludeReviewedByUserId") ?? "",
    },
    minAvgScore: {
      defaultValue: "",
      value: urlSearchParams.get("minAvgScore") ?? "",
    },
    maxAvgScore: {
      defaultValue: "",
      value: urlSearchParams.get("maxAvgScore") ?? "",
    },
    minScoreCount: {
      defaultValue: "",
      value: urlSearchParams.get("minScoreCount") ?? "",
    },
    maxScoreCount: {
      defaultValue: "",
      value: urlSearchParams.get("maxScoreCount") ?? "",
    },
    minBadScoreCount: {
      defaultValue: "",
      value: urlSearchParams.get("minBadScoreCount") ?? "",
    },
    maxBadScoreCount: {
      defaultValue: "",
      value: urlSearchParams.get("maxBadScoreCount") ?? "",
    },
    minGoodScoreCount: {
      defaultValue: "",
      value: urlSearchParams.get("minGoodScoreCount") ?? "",
    },
    maxGoodScoreCount: {
      defaultValue: "",
      value: urlSearchParams.get("maxGoodScoreCount") ?? "",
    },
    badScoreThreshold: {
      defaultValue: "",
      value: urlSearchParams.get("badScoreThreshold") ?? "",
    },
    goodScoreThreshold: {
      defaultValue: "",
      value: urlSearchParams.get("goodScoreThreshold") ?? "",
    },
    minReviewsCount: {
      defaultValue: "",
      value: urlSearchParams.get("minReviewsCount") ?? "",
    },
    maxReviewsCount: {
      defaultValue: "",
      value: urlSearchParams.get("maxReviewsCount") ?? "",
    },
    minPositiveReviewsCount: {
      defaultValue: "",
      value: urlSearchParams.get("minPositiveReviewsCount") ?? "",
    },
    maxPositiveReviewsCount: {
      defaultValue: "",
      value: urlSearchParams.get("maxPositiveReviewsCount") ?? "",
    },
    minNegativeReviewsCount: {
      defaultValue: "",
      value: urlSearchParams.get("minNegativeReviewsCount") ?? "",
    },
    maxNegativeReviewsCount: {
      defaultValue: "",
      value: urlSearchParams.get("maxNegativeReviewsCount") ?? "",
    },
    modelSlugs: {
      defaultValue: "",
      value: urlSearchParams.get("modelSlugs") ?? "",
    },
    maxPromptAgeDays: {
      defaultValue: null,
      value: urlSearchParams.get("maxPromptAgeDays")
        ? {
            label: urlSearchParams.get("maxPromptAgeDays")!,
            value: urlSearchParams.get("maxPromptAgeDays")!,
          }
        : null,
      convertToSearchParamValue: (option) =>
        option ? option?.value.toString() : undefined,
    },
    maxGapToFirstResponse: {
      defaultValue: "",
      value: urlSearchParams.get("maxGapToFirstResponse") ?? "",
    },
    isRevealed: {
      defaultValue: null,
      value:
        urlSearchParams.get("isRevealed") === "true"
          ? { value: "true", label: "Revealed" }
          : urlSearchParams.get("isRevealed") === "false"
            ? { value: "false", label: "Non-revealed" }
            : null,
      convertToSearchParamValue: (option) =>
        option ? option?.value.toString() : undefined,
    },
  });
  const isAnyFilterApplied = useMemo(() => {
    return Object.values(filters).some((filter) => {
      const value = filter.value;
      const defaultValue = filter.defaultValue;

      // Compare current value with default value
      // Handle arrays
      if (Array.isArray(value) && Array.isArray(defaultValue)) {
        return value.length !== defaultValue.length;
      }
      if (typeof value === "object") {
        return JSON.stringify(value) !== JSON.stringify(defaultValue);
      }

      // Handle other types
      return value !== defaultValue;
    });
  }, [filters]);

  /**
   * Converts the filter values to the query params and updates the URL using `router.replace()`.
   * Ignores the filter values that are `null`, `undefined`, empty string and `NaN`.
   */
  const updateURLSearchParams = useDebouncedCallback((newFilters: Filters) => {
    const newUrlSearchParams = new URLSearchParams(urlSearchParams);
    for (const [name, filter] of Object.entries<Filter<any>>(newFilters)) {
      // Convert the value to a string
      let paramValue = null;

      // If the filter is defined as fixed, no need to store it in the URL
      if (fixedFilters?.[name as keyof typeof fixedFilters] !== undefined) {
        paramValue = null;
      } else if (filter.convertToSearchParamValue !== undefined) {
        paramValue = filter.convertToSearchParamValue(filter.value);
      } else if (
        // Check the emptiness of the value
        filter.value === undefined ||
        filter.value === null ||
        (typeof filter.value === "number" && isNaN(filter.value)) ||
        (typeof filter.value === "string" && filter.value === "")
      ) {
        paramValue = null;
      } else {
        paramValue = String(filter.value);
      }

      // If the value is presented after the transformations, add it to the URL
      if (paramValue) {
        if (Array.isArray(paramValue)) {
          // Clear the previous values for this param
          newUrlSearchParams.delete(name);
          paramValue.forEach((p) => newUrlSearchParams.append(name, p));
        } else {
          newUrlSearchParams.set(name, paramValue);
        }
      } else {
        newUrlSearchParams.delete(name);
      }
    }

    // Update the search params only if they are different than before
    if (newUrlSearchParams.toString() !== urlSearchParams.toString()) {
      router.replace(`?${newUrlSearchParams.toString()}`, {
        scroll: false,
      });
    }
  }, 500);

  // Load the filters which they have to load some data async
  // to show their value (e.g Prompt Set info based on Prompt Set ID)
  useEffect(() => {
    for (const [key, filter] of Object.entries(filters) as [
      keyof Filters,
      Filter<any>,
    ][]) {
      if (filter.loadValueAsync !== undefined) {
        // Mark the filter as loading
        setFilters((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            isValueLoading: true,
          },
        }));

        filter
          .loadValueAsync()
          .then((asyncValue) => {
            // Update the state if the value is valid
            if (asyncValue !== undefined) {
              setFilters((prev) => ({
                ...prev,
                [key]: {
                  ...prev[key],
                  value: asyncValue,
                  isValueLoading: undefined,
                },
              }));
            }
          })
          .catch((err) => {
            console.error(`Error loading filter ${key}:`, err);

            // Stop loading
            setFilters((prev) => ({
              ...prev,
              [key]: {
                ...prev[key],
                isValueLoading: undefined,
              },
            }));
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onFiltersChange?.(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <PromptSearchFiltersContext.Provider
      value={{
        filters,
        fixedFilters,
        isAnyFilterApplied,
        updateFilters: (values, updateSearchParams = true) => {
          const newFilters: Record<keyof Filters, Filter<any>> = { ...filters };

          // Place new values to the corresponding filter objects
          for (const [key, value] of Object.entries(values) as [
            keyof Filters,
            Filter<any>["value"],
          ][]) {
            newFilters[key] = {
              ...filters[key],
              value,
            };
          }

          setFilters(newFilters);
          if (updateSearchParams) {
            updateURLSearchParams(newFilters);
          }
        },
        updateFilter: (key, value, updateSearchParams = true) => {
          const newFilters = {
            ...filters,
            [key]: {
              ...filters[key],
              ...value,
            },
          };

          setFilters(newFilters);

          if (updateSearchParams) {
            updateURLSearchParams(newFilters);
          }
        },
        clearFilters: () => {
          const newFilters = Object.fromEntries(
            Object.entries(filters).map(([key, filter]) => {
              // Don't clear the fixed filters
              if (
                fixedFilters?.[key as keyof typeof fixedFilters] !== undefined
              ) {
                return [key, filter];
              }

              return [
                key,
                {
                  ...filter,
                  value: filter.defaultValue,
                },
              ];
            })
          ) as Filters;

          setFilters(newFilters);
          updateURLSearchParams(newFilters);
        },
      }}
    >
      {children}
    </PromptSearchFiltersContext.Provider>
  );
}

export function usePromptSearchFiltersContext() {
  const context = useContext(PromptSearchFiltersContext);
  if (!context) {
    throw new Error(
      "usePromptSearchFiltersContext must be used inside PromptSearchFiltersContextProvider"
    );
  }
  return context;
}
