"use client";

import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  reactSelectStyles,
  reactSelectDisabledStyles,
} from "@/lib/styles/react-select-styles";
import { PromptType } from "peerbench";
import { PromptSetAccessReason } from "@/types/prompt-set";
import { usePromptSetAPI } from "@/lib/hooks/use-prompt-set-api";
import { useSearchParams } from "next/navigation";
import { useInfinitePromptSets } from "@/lib/react-query/use-infinite-prompt-sets";
import { useDocumentBody } from "@/lib/hooks/use-document-body";
import Select from "react-select";

export type PromptSetSelectOption = {
  id?: number;
  title: string;
  description: string;
  totalPromptsCount?: number;
  ownerId?: string;
  value?: string;
  label?: string;
  includingPromptTypes?: PromptType[];
};

export interface PromptSetSelectProps {
  disabled?: boolean;
  placeholder?: string;
  onChange?: (promptSet: PromptSetSelectOption | null) => void;
  id?: string;
  value?: PromptSetSelectOption | null;
  accessReason?: PromptSetAccessReason;
  /**
   * URL parameter name to read the prompt set ID from.
   * When provided, the component will check for this parameter in the URL
   * after options load and automatically select the matching prompt set.
   * Example: "promptSet" will look for ?promptSet=123 in the URL
   */
  urlParamName?: string;

  defaultPromptSetId?: number;
}

export interface PromptSetSelectHandler {
  clear: () => void;
}

const PromptSetSelect = forwardRef<
  PromptSetSelectHandler,
  PromptSetSelectProps
>(
  (
    {
      onChange,
      disabled = false,
      placeholder = "Select a Benchmark...",
      id,
      value,
      accessReason,
      urlParamName,
      defaultPromptSetId,
    },
    ref
  ) => {
    const [selectedPromptSet, setSelectedPromptSet] =
      useState<PromptSetSelectOption | null>(value || null);
    const { getPromptSets } = usePromptSetAPI();
    const documentBodyEl = useDocumentBody();
    const searchParams = useSearchParams();
    const hasPromptSetSelected = useRef(false);
    const {
      data: promptSets,
      error,
      isLoading,
      isFetchingNextPage,
    } = useInfinitePromptSets(
      { accessReason },
      {
        // Disable infinite scroll and auto-load next page when available
        enableInfiniteScroll: false,
        autoLoadNextPage: true,
      }
    );
    const [isPromptSetSelectionLoading, setIsPromptSetSelectionLoading] =
      useState(isLoading);

    // Transform data for react-select
    const options: PromptSetSelectOption[] = useMemo(() => {
      const o: PromptSetSelectOption[] = promptSets.map((set) => ({
        ...set,
        value: set.id.toString(),
        label: set.title,
        includingPromptTypes: set.includingPromptTypes,
      }));

      // If loading is in progress, add a loading item to the options
      if (isFetchingNextPage) {
        o.push({
          id: -1, // Special ID for loading option
          title: "Loading more Benchmarks...",
          description: "",
          totalPromptsCount: 0,
          ownerId: "",
          value: "-1",
          label: "Loading more Benchmarks...",
          isDisabled: true,
        } as PromptSetSelectOption & { isDisabled: boolean });
      }

      return o;
    }, [promptSets, isFetchingNextPage]);

    const handleChange = useCallback(
      (newValue: any) => {
        // Don't allow selection of disabled loading option
        if (newValue && (newValue as any).isDisabled) {
          return;
        }

        setSelectedPromptSet(newValue);
        onChange?.(newValue);
      },
      [onChange]
    );

    const loadAndSelectPromptSet = useCallback(
      (id: number) => {
        setIsPromptSetSelectionLoading(true);
        getPromptSets({
          id,
          page: 1,
          pageSize: 1,
          accessReason,
        })
          .then((result) => {
            const [promptSet] = result.data;
            if (!promptSet) {
              return;
            }

            const selectedOption: PromptSetSelectOption = {
              ...promptSet,
              value: promptSet.id.toString(),
              label: promptSet.title,
              includingPromptTypes: promptSet.includingPromptTypes,
            };

            setSelectedPromptSet(selectedOption);
            onChange?.(selectedOption);
            hasPromptSetSelected.current = true;
          })
          .catch((error) => console.error("Failed to fetch Prompt Set:", error))
          .finally(() => setIsPromptSetSelectionLoading(false));
      },
      [accessReason, getPromptSets, onChange]
    );

    const loadDefaultPromptSet = useCallback(() => {
      // Load the default Prompt Set specifically if provided
      if (!hasPromptSetSelected.current && defaultPromptSetId !== undefined) {
        loadAndSelectPromptSet(defaultPromptSetId);
        hasPromptSetSelected.current = true;
      } else if (isPromptSetSelectionLoading) {
        // Otherwise stop the loading state since there won't be
        // a programmatically selected Prompt Set
        setIsPromptSetSelectionLoading(false);
      }
    }, [
      defaultPromptSetId,
      loadAndSelectPromptSet,
      isPromptSetSelectionLoading,
    ]);

    // Expose clear method to parent component
    useImperativeHandle(ref, () => ({
      clear: () => {
        setSelectedPromptSet(null);
        onChange?.(null);
      },
    }));

    // Sync local state with the value prop
    useEffect(() => {
      setSelectedPromptSet(value || null);
    }, [value]);

    // Handle selection of a default Prompt Set
    useEffect(() => {
      if (
        hasPromptSetSelected.current || // Already selected a Prompt Set programmatically
        isLoading || // Still loading first page of Prompt Sets
        options.length === 0 || // No Prompt Sets loaded yet
        selectedPromptSet !== null // No Prompt Set selected yet
      ) {
        return;
      }

      // If the URL param is not specified, fallback to the default selection if there is one
      if (!urlParamName) {
        loadDefaultPromptSet();
        return;
      }

      // Get and validate the Prompt Set ID provided in the URL parameter
      const urlParam = searchParams.get(urlParamName);
      if (urlParam === null) {
        loadDefaultPromptSet();
        return;
      }

      const promptSetId = parseInt(urlParam);
      if (isNaN(promptSetId)) {
        loadDefaultPromptSet();
        return;
      }

      // Try to find the prompt set in the loaded options
      const matchingOption = options.find((opt) => opt.id === promptSetId);
      if (matchingOption) {
        // Found in already loaded options
        setSelectedPromptSet(matchingOption);
        onChange?.(matchingOption);
        hasPromptSetSelected.current = true;
        setIsPromptSetSelectionLoading(false);
      } else {
        // Not found in loaded options, fetch it specifically
        loadAndSelectPromptSet(promptSetId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlParamName, options]);

    if (error) {
      return (
        <div className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
          {error instanceof Error
            ? error.message
            : "Failed to fetch Benchmarks"}
        </div>
      );
    }

    return (
      <div className="w-full space-y-4">
        <Select
          id={id}
          menuPortalTarget={documentBodyEl}
          instanceId={id}
          value={selectedPromptSet}
          onChange={handleChange}
          options={options}
          placeholder={
            isLoading || isPromptSetSelectionLoading
              ? "Loading..."
              : placeholder
          }
          isDisabled={disabled || isLoading || isPromptSetSelectionLoading}
          isLoading={isLoading || isPromptSetSelectionLoading}
          isSearchable
          className="react-select"
          classNamePrefix="react-select"
          formatOptionLabel={formatOptionLabel}
          isOptionDisabled={(option) => (option as any).isDisabled || false}
          noOptionsMessage={() => "No Benchmarks found"}
          styles={
            disabled || isLoading || isPromptSetSelectionLoading
              ? reactSelectDisabledStyles
              : reactSelectStyles
          }
        />
      </div>
    );
  }
);

// Format option label for react-select
const formatOptionLabel = (data: unknown) => {
  const option = data as PromptSetSelectOption;
  const isDisabled = (option as any).isDisabled || false;

  return (
    <div className="flex flex-col py-1 w-full">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {option.title || option.label}
        </span>
        {!isDisabled && (
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md mx-2">
            ID: {option.id}
          </span>
        )}
      </div>
      {option.description && !isDisabled && (
        <span className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
          {option.description.length > 100
            ? `${option.description.slice(0, 100)}...`
            : option.description}
        </span>
      )}
      {!isDisabled && (
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{option.totalPromptsCount} questions</span>
        </div>
      )}
      {isDisabled && (
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
          <span>Please wait...</span>
        </div>
      )}
    </div>
  );
};

PromptSetSelect.displayName = "PromptSetSelect";

export default PromptSetSelect;
