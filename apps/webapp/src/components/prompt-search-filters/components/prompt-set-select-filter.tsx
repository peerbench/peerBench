"use client";

import { useDataAPI } from "@/lib/hooks/use-data-api";
import { useDocumentBody } from "@/lib/hooks/use-document-body";
import {
  reactSelectDisabledStyles,
  reactSelectStyles,
} from "@/lib/styles/react-select-styles";
import { usePromptSearchFiltersContext, SelectOption } from "../context";
import { cn } from "@/utils/cn";
import { LucideFolderOpen } from "lucide-react";
import AsyncSelect from "react-select/async";

export default function PromptSetSelectFilter({
  className,
  showIcon = true,
  showLabel = true,
  placeholder = "Select a Benchmark...",
}: {
  className?: string;
  showIcon?: boolean;
  showLabel?: boolean;
  placeholder?: string;
}) {
  const documentEl = useDocumentBody();
  const ctx = usePromptSearchFiltersContext();
  const { getPromptSetFilters } = useDataAPI();

  const loadPromptSetOptions = async (inputValue: string) => {
    return getPromptSetFilters({
      page: 1,
      pageSize: 20,
      title: inputValue,
    })
      .then((response) =>
        response.data.map((item) => ({
          value: item.id,
          label: item.title,
        }))
      )
      .catch((err) => {
        console.error("Error loading Benchmarks:", err);
        return [];
      });
  };

  const handleOnOptionChange = (option: SelectOption<number> | null) => {
    ctx.updateFilter("promptSetId", {
      value: option,
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
          {showIcon && <LucideFolderOpen size={14} />}
          Benchmark
        </label>
      )}
      <AsyncSelect
        isSearchable={ctx.fixedFilters?.promptSetId === undefined}
        isClearable={ctx.fixedFilters?.promptSetId === undefined}
        defaultOptions
        value={ctx.filters.promptSetId.value}
        onChange={handleOnOptionChange}
        styles={
          ctx.filters.promptSetId.isValueLoading ||
          ctx.fixedFilters?.promptSetId !== undefined
            ? reactSelectDisabledStyles
            : reactSelectStyles
        }
        menuPortalTarget={documentEl}
        loadOptions={loadPromptSetOptions}
        instanceId={`react-select-promptSetId`}
        placeholder={placeholder}
        loadingMessage={() => "Loading benchmarks..."}
        isLoading={ctx.filters.promptSetId.isValueLoading}
        isDisabled={
          ctx.filters.promptSetId.isValueLoading ||
          ctx.fixedFilters?.promptSetId !== undefined
        }
      />
    </div>
  );
}
