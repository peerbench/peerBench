"use client";

import { cn } from "@/utils/cn";
import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { LucideInfo } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { LucideX } from "lucide-react";

export type CheckboxFilterInputProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  onClear: () => void;
  isDirty: boolean;
  title?: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  clearButtonPosition?: "title" | "input";
  disabled?: boolean;
  className?: string;
  tooltip?: ReactNode;
};

export function CheckboxFilterInput({
  value,
  onChange,
  onClear,
  isDirty,
  title,
  label,
  icon: Icon,
  clearButtonPosition = "title",
  className,
  tooltip,
  disabled,
}: CheckboxFilterInputProps) {
  const handleValueChange = (newChecked: boolean | "indeterminate") => {
    if (newChecked === true) {
      onChange(true);
    } else {
      onChange(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        {title && (
          <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
            {Icon && <Icon className="w-4 h-4" />}
            {title}
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <LucideInfo className="w-4 h-4 ml-1 opacity-60 cursor-help text-gray-800" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </label>
        )}
        {!disabled && isDirty && clearButtonPosition === "title" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="w-fit h-fit p-0 dark:hover:bg-gray-800"
            disabled={disabled}
          >
            <LucideX size={10} />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`checkbox-${label}`}
          checked={value}
          onCheckedChange={handleValueChange}
          disabled={disabled}
        />
        <Label
          htmlFor={`checkbox-${label}`}
          className="text-sm font-normal cursor-pointer"
        >
          {label}
        </Label>
        {!disabled && isDirty && clearButtonPosition === "input" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="w-fit h-fit p-0 dark:hover:bg-gray-800 ml-auto"
            disabled={disabled}
          >
            <LucideX size={10} />
          </Button>
        )}
      </div>
    </div>
  );
}
