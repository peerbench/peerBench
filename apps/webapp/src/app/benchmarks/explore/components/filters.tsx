"use client";

import {
  Accordion,
  AccordionTrigger,
  AccordionItem,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  LucideEye,
  LucideFunnel,
  LucideNewspaper,
  LucideRotateCcw,
  LucideSearch,
  LucideSettings,
  LucideSortAsc,
  LucideTag,
} from "lucide-react";
import { StringFilterInput } from "@/components/filters/string-filter-input";
import {
  promptSetFiltersQueryParams,
  promptSetOrderingOptions,
} from "../context";
import { SelectFilterInput } from "@/components/filters/select-filter-input";
import { capitalize } from "@/utils/capitalize";
import { CheckboxFilterInput } from "@/components/filters/checkbox-filter-input";
import { FilterGroup } from "@/components/filters/filter-group";
import { PromptSetVisibilities, PromptSetVisibility } from "@/types/prompt-set";
import { Button } from "@/components/ui/button";
import { usePageContext } from "../context";
import {
  usePromptSetCategories,
  usePromptSetTags,
} from "@/lib/react-query/use-filters";

export function Filters() {
  const { hasActiveFilters, clearFilters, setFilters, filters } =
    usePageContext();
  const { data: promptSetCategories, isLoading: isLoadingPromptSetCategories } =
    usePromptSetCategories({
      page: 1,
      // TODO: Fetch at once or page by page?
      pageSize: 5000,
    });

  const { data: promptSetTags, isLoading: isLoadingPromptSetTags } =
    usePromptSetTags({
      page: 1,
      // TODO: Fetch at once or page by page?
      pageSize: 5000,
    });

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={hasActiveFilters ? "filters" : undefined}
    >
      <AccordionItem value="filters" className="bg-white">
        <AccordionTrigger className="pl-6">
          <div className="flex items-center gap-2">
            <LucideFunnel size={16} />
            Filters
          </div>
        </AccordionTrigger>
        <AccordionContent className="grid grid-cols-6 gap-6 px-6 pb-4">
          <StringFilterInput
            className="col-span-6"
            label="Search"
            icon={LucideSearch}
            onClear={() =>
              setFilters({
                search: promptSetFiltersQueryParams.search.defaultValue,
              })
            }
            isDirty={
              filters.search !== promptSetFiltersQueryParams.search.defaultValue
            }
            value={filters.search}
            onChange={(value) => setFilters({ search: value })}
            placeholder="Search by title, description, citation info or ID..."
          />
          <SelectFilterInput<PromptSetVisibility>
            label="Visibility"
            icon={LucideEye}
            value={filters.visibility}
            className="col-span-2"
            placeholder="All"
            onChange={(value) => setFilters({ visibility: value })}
            options={Object.values(PromptSetVisibilities).map((value) => ({
              value,
              label: capitalize(value),
            }))}
          />
          <SelectFilterInput
            label="Categories"
            isMulti
            icon={LucideNewspaper}
            value={filters.categories}
            isLoading={isLoadingPromptSetCategories}
            isSearchable
            className="col-span-2"
            placeholder="Select categories..."
            onChange={(value) => setFilters({ categories: value })}
            options={
              promptSetCategories?.map((v) => ({
                value: v,
                label: v,
              })) ?? []
            }
          />
          <SelectFilterInput
            label="Tags"
            isMulti
            icon={LucideTag}
            value={filters.tags}
            isLoading={isLoadingPromptSetTags}
            isSearchable
            className="col-span-2"
            placeholder="Select tags..."
            onChange={(value) => setFilters({ tags: value })}
            options={
              promptSetTags?.map((v) => ({
                value: v,
                label: v,
              })) ?? []
            }
          />
          <SelectFilterInput
            label="Order by"
            className="col-span-2"
            placeholder="None"
            icon={LucideSortAsc}
            value={filters.orderBy}
            isClearable
            onChange={(value) => setFilters({ orderBy: value })}
            options={promptSetOrderingOptions}
          />
          <FilterGroup
            containerClassName="col-span-2"
            title="Misc"
            icon={LucideSettings}
          >
            <CheckboxFilterInput
              label="Only created by me"
              clearButtonPosition="input"
              value={filters.createdByMe}
              onChange={(value) => setFilters({ createdByMe: value })}
              onClear={() => setFilters({ createdByMe: false })}
              isDirty={
                filters.createdByMe !==
                promptSetFiltersQueryParams.createdByMe.defaultValue
              }
            />
          </FilterGroup>
          {hasActiveFilters && (
            <div className="col-span-6 flex justify-end">
              <Button
                onClick={clearFilters}
                type="button"
                variant="outline"
                size="sm"
              >
                <LucideRotateCcw size={16} />
                Clear Filters
              </Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
