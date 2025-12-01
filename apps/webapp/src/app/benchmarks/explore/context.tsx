"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import {
  createMultiParser,
  createParser,
  parseAsBoolean,
  parseAsString,
  SetValues,
  useQueryStates,
  Values,
} from "nuqs";
import { EnumSchema } from "peerbench";
import { PromptSetOrderings, PromptSetVisibilities } from "@/types/prompt-set";
import { capitalize } from "@/utils/capitalize";
import { orderBySchema } from "@/validation/api/orderby";

export const promptSetOrderingOptions = [
  {
    value: `${PromptSetOrderings.mostRecent}:desc`,
    label: "Most Recent Activity",
  },
  {
    value: `${PromptSetOrderings.mostRecent}:asc`,
    label: "Least Recent Activity",
  },
];

export const promptSetFiltersQueryParams = {
  search: parseAsString.withDefault(""),
  categories: createMultiParser({
    parse: (value) => value.map((v) => ({ value: v, label: v })),
    serialize: (value) => value.map((v) => v.value),
    eq: (a, b) => a.every((v) => b.some((v2) => v2.value === v.value)),
  }).withDefault([]),
  tags: createMultiParser({
    parse: (value) => value.map((v) => ({ value: v, label: v })),
    serialize: (value) => value.map((v) => v.value),
    eq: (a, b) => a.every((v) => b.some((v2) => v2.value === v.value)),
  }).withDefault([]),
  visibility: createParser({
    parse: (value) => ({
      value: EnumSchema(PromptSetVisibilities).parse(value),
      label: capitalize(value),
    }),
    serialize: (value) => value.value,
  }),
  createdByMe: parseAsBoolean.withDefault(false),
  orderBy: createParser({
    parse: (value) => {
      const parsed = orderBySchema(PromptSetOrderings).parse(value);
      const option = promptSetOrderingOptions.find(
        (v) => v.value === `${parsed.key}:${parsed.direction}`
      );

      return option ? option : null;
    },
    serialize: (value) => value.value,
  }),
};

export type PromptSetFilters = typeof promptSetFiltersQueryParams;

export type PageContextType = {
  filters: Values<PromptSetFilters>;
  setFilters: SetValues<PromptSetFilters>;
  clearFilters: () => void;

  hasActiveFilters: boolean;
};

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useQueryStates(promptSetFiltersQueryParams, {
    history: "push",
    clearOnDefault: true,
  });

  const hasActiveFilters = useMemo(() => {
    return Object.keys(promptSetFiltersQueryParams).some((paramName) => {
      const key = paramName as keyof PromptSetFilters;
      return !promptSetFiltersQueryParams[key].eq(
        filters[key] as never,
        ("defaultValue" in promptSetFiltersQueryParams[key]
          ? promptSetFiltersQueryParams[key].defaultValue
          : null) as never
      );
    });
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters((prev) => {
      const keys = Object.keys(prev);
      const newEntries = keys.map((paramName) => {
        const key = paramName as keyof PromptSetFilters;

        return [
          paramName,
          "defaultValue" in promptSetFiltersQueryParams[key]
            ? promptSetFiltersQueryParams[key].defaultValue
            : null,
        ];
      });

      return Object.fromEntries(newEntries);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageContext.Provider
      value={{ filters, setFilters, hasActiveFilters, clearFilters }}
    >
      {children}
    </PageContext.Provider>
  );
}

export const PageContext = createContext<PageContextType | null>(null);

export function usePageContext() {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePageContext must be used inside PageContextProvider");
  }
  return context;
}
