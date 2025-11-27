"use client";

import { Input } from "@/components/ui/input";
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

export type StringFilterProps<Key extends keyof Filters> = {
  filterName: Key;
  label: string;
  type?: "text" | "number";
  step?: number;
  min?: number;
  max?: number;
  icon?: ReactNode;
  validate: (value?: unknown) => boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  tooltip?: ReactNode;
};

export default function StringFilter<Key extends keyof Filters>({
  filterName,
  validate,
  placeholder,
  disabled,
  label,
  icon,
  type = "text",
  step,
  min,
  max,
  className,
  tooltip,
}: StringFilterProps<Key>) {
  const ctx = usePromptSearchFiltersContext();
  const [error, setError] = useState<string | null>(null);
  const filter = ctx.filters[filterName];
  const validateValue = useCallback(() => {
    // Load the initial value from the search params
    if (!filter.value) {
      return String(filter.defaultValue);
    }

    if (validate(filter.value)) {
      return String(filter.value);
    }

    return String(filter.defaultValue);
  }, [validate, filter.value, filter.defaultValue]);

  // Use a local state to apply validation
  const [value, setValue] = useState<string>(validateValue());

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (validate(e.target.value)) {
      ctx.updateFilter(filterName, {
        value: e.target.value,
      });
      setError(null);
    } else {
      if (e.target.value !== "") {
        setError("Invalid value");
      } else {
        // Clear error if no value is present
        setError(null);
      }
    }
  };

  const handleClear = () => {
    setError(null);
    setValue(String(filter.defaultValue));
    ctx.updateFilter(filterName, {
      value: filter.defaultValue,
    });
  };

  // Update the local state if the filter value changes
  useEffect(() => {
    // Don't accept invalid values and also revert
    // that value to the default on the context level.
    if (!validate(filter.value)) {
      setValue(String(filter.defaultValue));
      ctx.updateFilter(
        filterName,
        { value: filter.defaultValue },
        false // Only update the state on the context level, not the URL
      );
      return;
    }

    setValue(String(filter.value));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.value]);

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
        {!disabled && value && (
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
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e)}
        className="w-full"
        inputClassName="bg-background"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
      />
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
