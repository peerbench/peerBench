"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useDataAPI } from "@/lib/hooks/use-data-api";
import { useDebouncedCallback } from "@/lib/hooks/use-debounce";
import {
  reactSelectStyles,
  reactSelectErrorStyles,
} from "@/lib/styles/react-select-styles";

const AsyncCreatableSelect = dynamic(
  () => import("react-select/async-creatable"),
  { ssr: false }
);

interface TagOption {
  value: string;
  label: string;
}

interface TagsMultiSelectProps {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function TagsMultiSelect({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = "Select tags...",
}: TagsMultiSelectProps) {
  const dataAPI = useDataAPI();

  // Convert current value to selected options
  const selectedOptions: TagOption[] = useMemo(() => {
    return value.map((tag) => ({
      value: tag,
      label: tag,
    }));
  }, [value]);

  const handleChange = useCallback(
    (newValue: unknown) => {
      if (Array.isArray(newValue)) {
        const tags = newValue.map((option: TagOption) => option.value);
        onChange(tags);
      } else {
        onChange([]);
      }
    },
    [onChange]
  );

  const handleCreateOption = useCallback(
    (inputValue: string) => {
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
      }
    },
    [value, onChange]
  );

  const loadOptions = useDebouncedCallback(async (inputValue: string) => {
    try {
      const response = await dataAPI.getPromptSetTags({
        page: 1,
        pageSize: 10,
        search: inputValue || undefined,
      });
      return response.data.map((tag: string) => ({
        value: tag,
        label: tag,
      }));
    } catch (error) {
      console.error("Error loading tags:", error);
      return [];
    }
  }, 300);

  return (
    <div className="space-y-2">
      <AsyncCreatableSelect
        isMulti
        value={selectedOptions}
        onChange={handleChange}
        onCreateOption={handleCreateOption}
        loadOptions={loadOptions}
        placeholder={placeholder}
        isSearchable
        isClearable
        isDisabled={disabled}
        styles={error ? reactSelectErrorStyles : reactSelectStyles}
        className="react-select-container"
        classNamePrefix="react-select"
        noOptionsMessage={({ inputValue }: { inputValue: string }) =>
          inputValue
            ? "No tags found"
            : "Start typing to search or create tags..."
        }
        loadingMessage={() => "Loading tags..."}
        formatCreateLabel={(inputValue: string) => `Create "${inputValue}"`}
        isValidNewOption={(inputValue: string) =>
          inputValue.trim().length > 0 && !value.includes(inputValue.trim())
        }
        cacheOptions
        defaultOptions
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
