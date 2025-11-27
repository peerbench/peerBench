"use client";

import { useDocumentBody } from "@/lib/hooks/use-document-body";
import { reactSelectStyles } from "@/lib/styles/react-select-styles";
import { usePromptSearchFiltersContext, SelectOption } from "../context";
import { PromptTypes } from "peerbench";
import { cn } from "@/utils/cn";
import { LucideLayers } from "lucide-react";
import Select from "react-select";

export default function PromptTypesFilter({
  className,
}: {
  className?: string;
}) {
  const documentEl = useDocumentBody();
  const ctx = usePromptSearchFiltersContext();

  const handleOnOptionChange = (options: readonly SelectOption<string>[]) => {
    ctx.updateFilters({
      type: options,
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
        <LucideLayers size={14} />
        Types
      </label>
      <Select
        isMulti
        isSearchable
        isClearable
        options={Object.values(PromptTypes).map((type) => ({
          value: type,
          label: type,
        }))}
        value={ctx.filters.type.value}
        onChange={handleOnOptionChange}
        styles={reactSelectStyles}
        menuPortalTarget={documentEl}
        instanceId={`react-select-types`}
        placeholder="Select Prompt types..."
      />
    </div>
  );
}
