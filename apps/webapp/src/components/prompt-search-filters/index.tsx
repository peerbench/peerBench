"use client";

import { z } from "zod";
import PromptSetSelectFilter from "./components/prompt-set-select-filter";
import PromptTagFilter from "./components/prompt-tag-filter";
import PromptTypesFilter from "./components/prompt-types-filter";
import StringFilter from "./components/string-filter";
import {
  PromptSearchFiltersContext,
  PromptSearchFiltersContextProvider,
  PromptSearchFiltersContextProviderProps,
  usePromptSearchFiltersContext,
} from "./context";
import ReviewStatusFilter from "./components/review-status-filter";
import AverageScoreFilter from "./components/average-score-filter";
import {
  LucideTestTube,
  LucideXCircle,
  LucideCheckCircle,
  LucideMessageSquare,
  LucideThumbsUp,
  LucideThumbsDown,
  LucideUser,
  LucideHash,
  RotateCcw,
  LucideCpu,
  LucideTimer,
} from "lucide-react";
import { Button } from "../ui/button";
import { useContext } from "react";
import { cn } from "@/utils/cn";
import SelectFilter from "./components/select-filter";
import { PromptStatuses } from "@/database/types";

export interface PromptSearchFiltersProps {
  className?: string;
  clearAllButton?: boolean;
  fixedFilters?: PromptSearchFiltersContextProviderProps["fixedFilters"];
  onFiltersChange?: PromptSearchFiltersContextProviderProps["onFiltersChange"];
}

function Comp({ className, clearAllButton = true }: PromptSearchFiltersProps) {
  const ctx = usePromptSearchFiltersContext();

  return (
    <div className={cn("grid grid-cols-6 gap-6", className)}>
      <PromptSetSelectFilter className="col-span-2" />
      <PromptTagFilter className="col-span-2" />
      <PromptTypesFilter className="col-span-2" />
      <StringFilter
        filterName="modelSlugs"
        label="Model Slugs (comma-separated)"
        icon={<LucideCpu size={14} />}
        validate={() => true}
        placeholder="e.g., gpt-4, claude-3, gemini-pro..."
        className="col-span-2"
      />
      <StringFilter
        filterName="uploaderId"
        label="Uploader ID"
        icon={<LucideUser size={14} />}
        validate={uuidValidation}
        placeholder="Enter uploader ID..."
        className="col-span-2"
      />
      <StringFilter
        filterName="reviewedByUserId"
        label="Reviewed By User ID"
        icon={<LucideUser size={14} />}
        validate={uuidValidation}
        placeholder="Enter user ID..."
        className="col-span-2"
      />
      <SelectFilter
        label="Max Prompt Age (days)"
        filterName="maxPromptAgeDays"
        className="col-span-2"
        options={[
          {
            value: "30",
            label: "30 days",
          },
          {
            value: "90",
            label: "90 days",
          },
          {
            value: "180",
            label: "180 days",
          },
          {
            value: "365",
            label: "1 year",
          },
        ]}
      />
      <StringFilter
        filterName="maxGapToFirstResponse"
        label="Max Gap to First Response (seconds)"
        validate={positiveNumberValidation}
        icon={<LucideTimer size={14} />}
        placeholder="Any"
        className="col-span-2"
        tooltip={
          <>
            Maximum gap in seconds between the registration <br />
            of the Prompt and the first Response that was collected
          </>
        }
      />
      <SelectFilter
        filterName="isRevealed"
        label="Reveal Status"
        className="col-span-2"
        showIcon
        options={[
          {
            value: "true",
            label: "Revealed",
          },
          {
            value: "false",
            label: "Non-revealed",
          },
        ]}
      />

      <SelectFilter
        filterName="status"
        label="Prompt Status"
        className="col-span-2"
        showIcon
        options={[
          {
            value: PromptStatuses.included,
            label: "Included",
          },
          {
            value: PromptStatuses.excluded,
            label: "Excluded",
          },
        ]}
      />
      <ReviewStatusFilter className="col-span-2" />
      <AverageScoreFilter className="col-span-2" />

      <div className="flex flex-col gap-3 col-span-6">
        <h3 className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
          <LucideTestTube size={16} />
          Total Score Count
        </h3>
        <div className="flex gap-3 items-center w-full">
          <StringFilter
            className="flex-1"
            filterName="minScoreCount"
            label="Minimum"
            icon={<LucideHash size={14} />}
            validate={positiveNumberValidation}
            placeholder="Any"
            type="number"
            step={1}
          />
          <StringFilter
            className="flex-1"
            filterName="maxScoreCount"
            label="Maximum"
            icon={<LucideHash size={14} />}
            validate={positiveNumberValidation}
            placeholder="Any"
            type="number"
            step={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 col-span-3">
        <h3 className="flex items-center gap-2 font-medium text-gray-700 col-span-3">
          <LucideXCircle size={16} />
          Bad Score Result
        </h3>
        <StringFilter
          filterName="minBadScoreCount"
          label="Minimum"
          icon={<LucideHash size={14} />}
          validate={positiveNumberValidation}
          placeholder="Any"
          type="number"
          step={1}
        />
        <StringFilter
          filterName="maxBadScoreCount"
          label="Maximum"
          icon={<LucideHash size={14} />}
          validate={positiveNumberValidation}
          placeholder="Any"
          type="number"
          step={1}
        />
        <StringFilter
          className="col-span-3"
          filterName="badScoreThreshold"
          label="Threshold (for considering a score as bad)"
          icon={<LucideHash size={14} />}
          validate={thresholdValidation}
          placeholder="0"
          type="number"
          step={0.01}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 col-span-3">
        <h3 className="flex items-center gap-2 font-medium text-gray-700 col-span-3">
          <LucideCheckCircle size={16} />
          Good Score Result
        </h3>

        <StringFilter
          filterName="minGoodScoreCount"
          label="Minimum"
          icon={<LucideHash size={14} />}
          validate={positiveNumberValidation}
          placeholder="Any"
          type="number"
          step={1}
        />
        <StringFilter
          filterName="maxGoodScoreCount"
          label="Maximum"
          icon={<LucideHash size={14} />}
          validate={positiveNumberValidation}
          placeholder="Any"
          type="number"
          step={1}
        />
        <StringFilter
          className="col-span-3"
          filterName="goodScoreThreshold"
          label="Threshold (for considering a score as good)"
          icon={<LucideHash size={14} />}
          validate={thresholdValidation}
          placeholder="0.5"
          type="number"
          step={0.01}
        />
      </div>

      <div className="flex flex-col gap-3 col-span-6">
        <h3 className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
          <LucideMessageSquare size={16} />
          Total Reviews Count
        </h3>
        <div className="flex gap-3 items-center">
          <StringFilter
            className="flex-1"
            filterName="minReviewsCount"
            label="Minimum"
            icon={<LucideHash size={14} />}
            validate={positiveNumberValidation}
            placeholder="Any"
            type="number"
            step={1}
          />
          <StringFilter
            className="flex-1"
            filterName="maxReviewsCount"
            label="Maximum"
            icon={<LucideHash size={14} />}
            validate={positiveNumberValidation}
            placeholder="Any"
            type="number"
            step={1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 col-span-3">
        <h3 className="flex items-center gap-2 font-medium text-gray-700 col-span-3">
          <LucideThumbsUp size={16} />
          Positive Reviews Count
        </h3>
        <StringFilter
          filterName="minPositiveReviewsCount"
          label="Minimum"
          icon={<LucideHash size={14} />}
          validate={positiveNumberValidation}
          placeholder="Any"
          type="number"
          step={1}
        />
        <StringFilter
          filterName="maxPositiveReviewsCount"
          label="Maximum"
          icon={<LucideHash size={14} />}
          validate={positiveNumberValidation}
          placeholder="Any"
          type="number"
          step={1}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 col-span-3">
        <h3 className="flex items-center gap-2 font-medium text-gray-700 col-span-3">
          <LucideThumbsDown size={16} />
          Negative Reviews Count
        </h3>
        <StringFilter
          filterName="minNegativeReviewsCount"
          label="Minimum"
          icon={<LucideHash size={14} />}
          validate={positiveNumberValidation}
          placeholder="Any"
          type="number"
          step={1}
        />
        <StringFilter
          filterName="maxNegativeReviewsCount"
          label="Maximum"
          icon={<LucideHash size={14} />}
          validate={positiveNumberValidation}
          placeholder="Any"
          type="number"
          step={1}
        />
      </div>
      {ctx.isAnyFilterApplied && clearAllButton && (
        <div className="flex col-span-6 justify-end">
          <Button variant="outline" size="sm" onClick={ctx.clearFilters}>
            <RotateCcw className="w-3 h-3" />
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}

export default function PromptSearchFilters({
  fixedFilters,
  onFiltersChange,
  ...props
}: PromptSearchFiltersProps) {
  // Only use Provider if the context is not presented
  const ctx = useContext(PromptSearchFiltersContext);

  if (!ctx) {
    return (
      <PromptSearchFiltersContextProvider
        fixedFilters={fixedFilters}
        onFiltersChange={onFiltersChange}
      >
        <Comp {...props} />
      </PromptSearchFiltersContextProvider>
    );
  }

  return <Comp {...props} />;
}

const uuidValidation = (value?: unknown) =>
  z.string().uuid("Invalid UUID").safeParse(value).success;
const positiveNumberValidation = (value?: unknown) => {
  const parsed = z.coerce.number().safeParse(value);
  return parsed.success && parsed.data >= 0;
};
const thresholdValidation = (value?: unknown) => {
  const parsed = z.coerce.number().safeParse(value);
  return parsed.success && parsed.data >= 0 && parsed.data <= 1;
};
