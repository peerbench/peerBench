"use client";

import { useDataAPI } from "@/lib/hooks/use-data-api";
import { useDocumentBody } from "@/lib/hooks/use-document-body";
import { reactSelectStyles } from "@/lib/styles/react-select-styles";
import { usePromptSearchFiltersContext, SelectOption } from "../context";
import { cn } from "@/utils/cn";
import { LucideTag } from "lucide-react";
import AsyncSelect from "react-select/async";

export default function PromptTagFilter({ className }: { className?: string }) {
  const documentEl = useDocumentBody();
  const ctx = usePromptSearchFiltersContext();
  const { getPromptTagFilters } = useDataAPI();

  const loadPromptTagOptions = async (inputValue: string) => {
    return getPromptTagFilters({
      page: 1,
      pageSize: 20,
      tag: inputValue,
    })
      .then((response) =>
        response.data.map((item) => ({
          value: item,
          label: item,
        }))
      )
      .catch((err) => {
        console.error("Error loading Prompt tags:", err);
        return [];
      });
  };

  const handleOnOptionChange = (options: readonly SelectOption<string>[]) => {
    ctx.updateFilters({
      tags: options,
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
        <LucideTag size={14} />
        Tags
      </label>
      <AsyncSelect
        isMulti
        isSearchable
        isClearable
        defaultOptions
        value={ctx.filters.tags.value}
        onChange={handleOnOptionChange}
        styles={reactSelectStyles}
        menuPortalTarget={documentEl}
        loadOptions={loadPromptTagOptions}
        instanceId={`react-select-tags`}
        placeholder="Select Prompt tags..."
      />
    </div>
  );
}
