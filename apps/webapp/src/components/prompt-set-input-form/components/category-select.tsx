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

interface CategoryOption {
  value: string;
  label: string;
}

interface CategorySelectProps {
  value: string | null;
  onChange: (category: string | null) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CategorySelect({
  value,
  onChange,
  error,
  placeholder = "Select category",
  disabled = false,
}: CategorySelectProps) {
  const dataAPI = useDataAPI();

  // Convert current value to selected option
  const selectedOption: CategoryOption | null = useMemo(() => {
    return value ? { value, label: value } : null;
  }, [value]);

  const handleChange = useCallback(
    (newValue: unknown) => {
      if (newValue && typeof newValue === "object" && "value" in newValue) {
        const option = newValue as CategoryOption;
        onChange(option.value);
      } else {
        onChange(null);
      }
    },
    [onChange]
  );

  const handleCreateOption = useCallback(
    (inputValue: string) => {
      const newCategory = inputValue.trim();
      if (newCategory) {
        onChange(newCategory);
      }
    },
    [onChange]
  );

  const loadOptions = useDebouncedCallback(async (inputValue: string) => {
    try {
      const response = await dataAPI.getPromptSetCategories({
        page: 1,
        pageSize: 10,
        search: inputValue || undefined,
      });
      return response.data.map((category: string) => ({
        value: category,
        label: category,
      }));
    } catch (error) {
      console.error("Error loading categories:", error);
      return [];
    }
  }, 300);

  return (
    <div className="space-y-2">
      <AsyncCreatableSelect
        value={selectedOption}
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
            ? "No categories found"
            : "Start typing to search or create category..."
        }
        loadingMessage={() => "Loading categories..."}
        formatCreateLabel={(inputValue: string) => `Create "${inputValue}"`}
        isValidNewOption={(inputValue: string) =>
          inputValue.trim().length > 0 && value !== inputValue.trim()
        }
        cacheOptions
        defaultOptions
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
