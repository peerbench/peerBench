"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/cn";
import { usePromptSearchFiltersContext } from "../context";
import { LucideX, LucideEye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth";

export default function ReviewStatusFilter({
  className,
  disabled = false,
}: {
  className?: string;
  disabled?: boolean;
}) {
  const user = useAuth();
  const ctx = usePromptSearchFiltersContext();

  const handleExcludeReviewedChange = (checked: boolean) => {
    ctx.updateFilters({
      excludeReviewedByUserId: checked
        ? user?.id
        : ctx.filters.excludeReviewedByUserId.defaultValue,
      reviewedByUserId: ctx.filters.reviewedByUserId.defaultValue,
    });
  };

  const handleOnlyReviewedChange = (checked: boolean) => {
    ctx.updateFilters({
      reviewedByUserId: checked
        ? user?.id
        : ctx.filters.reviewedByUserId.defaultValue,
      excludeReviewedByUserId: checked
        ? ctx.filters.excludeReviewedByUserId.defaultValue
        : ctx.filters.excludeReviewedByUserId.value,
    });
  };

  const clear = () => {
    ctx.updateFilters({
      excludeReviewedByUserId: ctx.filters.excludeReviewedByUserId.defaultValue,
      reviewedByUserId: ctx.filters.reviewedByUserId.defaultValue,
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
          <LucideEye size={14} />
          Review Status
        </label>
        {!disabled &&
          (Boolean(ctx.filters.excludeReviewedByUserId.value) ||
            ctx.filters.reviewedByUserId.value === user?.id) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              className="w-fit h-fit p-0 dark:hover:bg-gray-800"
            >
              <LucideX size={10} />
            </Button>
          )}
      </div>
      <div className="flex flex-col flex-wrap gap-3 justify-center">
        {[
          {
            label: "Exclude Reviewed By Me",
            value: Boolean(ctx.filters.excludeReviewedByUserId.value),
            onChange: handleExcludeReviewedChange,
          },
          {
            label: "Only Reviewed By Me",
            value: ctx.filters.reviewedByUserId.value === user?.id,
            onChange: handleOnlyReviewedChange,
          },
        ].map((option, index) => (
          <div className="flex items-center space-x-3" key={index}>
            <Checkbox
              id={option.label}
              checked={option.value}
              onCheckedChange={option.onChange}
              disabled={disabled}
            />
            <label
              htmlFor={option.label}
              className={cn("text-sm font-medium cursor-pointer")}
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
