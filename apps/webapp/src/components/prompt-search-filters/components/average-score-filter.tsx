"use client";

import { useMemo } from "react";
import { RangeSlider } from "@/components/range-slider";
import { Button } from "@/components/ui/button";
import { LucideX, LucideBarChart3 } from "lucide-react";
import { usePromptSearchFiltersContext } from "../context";
import { cn } from "@/utils/cn";

const MIN_SCORE = 0;
const MAX_SCORE = 1;
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 1;

export default function AverageScoreFilter({
  className,
}: {
  className?: string;
}) {
  const ctx = usePromptSearchFiltersContext();
  // TODO: Debounce here, otherwise there will be too much update while user is moving the slider around. Probably using an inner state and syncing it with the context state would work.
  const values = useMemo(() => {
    const minValue = ctx.filters.minAvgScore.value;
    const maxValue = ctx.filters.maxAvgScore.value;

    // Validate URL values and use defaults if invalid
    let minValueNum = DEFAULT_MIN;
    let maxValueNum = DEFAULT_MAX;

    if (minValue) {
      const parsedMin = parseFloat(minValue);
      if (
        !isNaN(parsedMin) &&
        parsedMin >= DEFAULT_MIN &&
        parsedMin <= DEFAULT_MAX
      ) {
        minValueNum = parsedMin;
      }
    }

    if (maxValue) {
      const parsedMax = parseFloat(maxValue);
      if (
        !isNaN(parsedMax) &&
        parsedMax >= DEFAULT_MIN &&
        parsedMax <= DEFAULT_MAX
      ) {
        maxValueNum = parsedMax;
      }
    }

    return [minValueNum, maxValueNum] as const;
  }, [ctx.filters.minAvgScore.value, ctx.filters.maxAvgScore.value]);

  const handleChange = (newValues: [number, number]) => {
    if (newValues[0] === DEFAULT_MIN && newValues[1] === DEFAULT_MAX) {
      ctx.updateFilters({
        minAvgScore: "",
        maxAvgScore: "",
      });
      return;
    }

    ctx.updateFilters({
      minAvgScore: newValues[0].toString(),
      maxAvgScore: newValues[1].toString(),
    });
  };

  const clear = () => {
    ctx.updateFilters({
      minAvgScore: "",
      maxAvgScore: "",
    });
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
          <LucideBarChart3 size={14} />
          Avg. Score
        </label>
        {(values[0] > DEFAULT_MIN || values[1] < DEFAULT_MAX) && (
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
      <div className="p-4 dark:bg-gray-800 rounded-lg">
        <RangeSlider
          min={MIN_SCORE}
          max={MAX_SCORE}
          step={0.01}
          values={values}
          onChange={handleChange}
          formatValue={(value) => value.toFixed(2)}
          className="w-full"
        />
      </div>
    </div>
  );
}
