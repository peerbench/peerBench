"use client";

import { useDocumentBody } from "@/lib/hooks/use-document-body";
import {
  reactSelectDisabledStyles,
  reactSelectStyles,
} from "@/lib/styles/react-select-styles";
import {
  usePromptSearchFiltersContext,
  SelectOption,
  Filters,
} from "../context";
import { cn } from "@/utils/cn";
import { LucideFolderOpen } from "lucide-react";
import Select from "react-select";

export type SelectFilterProps<Key extends keyof Filters> = {
  filterName: Key;
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  placeholder?: string;
  options: SelectOption<string>[];
  label: string;
};

export default function SelectFilter<Key extends keyof Filters>({
  filterName,
  className,
  showIcon = true,
  showLabel = true,
  placeholder = "Select an option...",
  label,
  options,
}: SelectFilterProps<Key>) {
  const documentEl = useDocumentBody();
  const ctx = usePromptSearchFiltersContext();
  const fixedFilter =
    ctx.fixedFilters?.[filterName as keyof typeof ctx.fixedFilters];
  const filter = ctx.filters[filterName];

  const handleOnOptionChange = (option: SelectOption<string> | null) => {
    ctx.updateFilter(filterName, {
      value: option,
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
          {showIcon && <LucideFolderOpen size={14} />}
          {label}
        </label>
      )}
      <Select
        isSearchable={fixedFilter === undefined}
        isClearable={fixedFilter === undefined}
        value={filter.value}
        onChange={handleOnOptionChange}
        styles={
          filter.isValueLoading || fixedFilter !== undefined
            ? reactSelectDisabledStyles
            : reactSelectStyles
        }
        menuPortalTarget={documentEl}
        instanceId={`react-select-filter-${filterName}`}
        placeholder={placeholder}
        isLoading={filter.isValueLoading}
        isDisabled={filter.isValueLoading || fixedFilter !== undefined}
        options={options}
      />
    </div>
  );
}
