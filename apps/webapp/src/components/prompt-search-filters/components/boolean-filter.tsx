"use client";

import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Info, LucideX } from "lucide-react";
import { Filters, usePromptSearchFiltersContext } from "../context";
import { cn } from "@/utils/cn";
import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type BooleanFilterProps<Key extends keyof Filters> = {
  filterName: Key;
  label: string;
  icon?: ReactNode;
  validate: (value?: unknown) => boolean;
  disabled?: boolean;
  className?: string;
  tooltip?: ReactNode;
  trueLabel?: string;
  falseLabel?: string;
};

export default function BooleanFilter<Key extends keyof Filters>({
  filterName,
  validate,
  disabled,
  label,
  icon,
  className,
  tooltip,
  trueLabel = "Yes",
  falseLabel = "No",
}: BooleanFilterProps<Key>) {
  const ctx = usePromptSearchFiltersContext();
  const [error, setError] = useState<string | null>(null);
  const filter = ctx.filters[filterName];

  const toRadioValue = useCallback((value: unknown) => {
    if (value === undefined || value === null) {
      return "";
    }
    return value === true ? "true" : "false";
  }, []);

  const fromRadioValue = (value: string): boolean | undefined => {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    return undefined;
  };

  // Use a local state to apply validation
  const [selectedValue, setSelectedValue] = useState<string>(
    toRadioValue(filter.value)
  );

  const onChange = (newValue: string) => {
    setSelectedValue(newValue);
    const boolValue = fromRadioValue(newValue);

    if (validate(boolValue)) {
      ctx.updateFilter(filterName, {
        value: boolValue as unknown as Filters[Key]["value"],
      });
      setError(null);
    } else {
      setError("Invalid value");
    }
  };

  const handleClear = () => {
    setError(null);
    const defaultValue = toRadioValue(filter.defaultValue);
    setSelectedValue(defaultValue);
    ctx.updateFilter(filterName, {
      value: filter.defaultValue,
    });
  };

  // Update the local state if the filter value changes
  useEffect(() => {
    // Don't accept invalid values and also revert
    // that value to the default on the context level.
    if (!validate(filter.value)) {
      const defaultValue = toRadioValue(filter.defaultValue);
      setSelectedValue(defaultValue);
      ctx.updateFilter(
        filterName,
        { value: filter.defaultValue },
        false // Only update the state on the context level, not the URL
      );
      return;
    }

    setSelectedValue(toRadioValue(filter.value));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.value]);

  const isDifferentFromDefault =
    selectedValue !== toRadioValue(filter.defaultValue);
  const trueId = `${String(filterName)}-true`;
  const falseId = `${String(filterName)}-false`;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
          {icon}
          {label}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 ml-1 opacity-60 cursor-help text-gray-800" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </label>
        {!disabled && isDifferentFromDefault && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="w-fit h-fit p-0 dark:hover:bg-gray-800"
            disabled={disabled}
          >
            <LucideX size={10} />
          </Button>
        )}
      </div>
      <RadioGroup
        value={selectedValue}
        onValueChange={onChange}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="true" id={trueId} disabled={disabled} />
          <label
            htmlFor={trueId}
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            {trueLabel}
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="false" id={falseId} disabled={disabled} />
          <label
            htmlFor={falseId}
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            {falseLabel}
          </label>
        </div>
      </RadioGroup>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-red-500"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
