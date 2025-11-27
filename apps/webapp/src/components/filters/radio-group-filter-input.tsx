"use client";

import { cn } from "@/utils/cn";
import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { LucideInfo } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { LucideX } from "lucide-react";

export type RadioGroupFilterInputOption<TValue = unknown> = {
  value: TValue;
  label: string;
};

export type RadioGroupFilterInputProps<TValue = string> = {
  value: TValue | null;
  onChange: (value: TValue | null) => void;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  options: RadioGroupFilterInputOption<TValue>[];
  clearButtonPosition?: "title" | "input";
  disabled?: boolean;
  className?: string;
  tooltip?: ReactNode;
  gridColumns?: number;
};

export function RadioGroupFilterInput<TValue = string>({
  value,
  onChange,
  title,
  icon: Icon,
  className,
  tooltip,
  options,
  clearButtonPosition = "title",
  disabled,
  gridColumns = 3,
}: RadioGroupFilterInputProps<TValue>) {
  const selectedValue = value !== null ? String(value) : undefined;
  const handleValueChange = (newValue: string | null) => {
    if (newValue === null) {
      onChange(null);
      return;
    }

    const option = options.find((opt) => String(opt.value) === newValue);
    onChange(option ? option.value : null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
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
        {!disabled && value !== null && clearButtonPosition === "title" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleValueChange(null)}
            className="w-fit h-fit p-0 dark:hover:bg-gray-800"
            disabled={disabled}
          >
            <LucideX size={10} />
          </Button>
        )}
      </div>
      <div className="relative">
        <RadioGroup
          value={selectedValue}
          onValueChange={handleValueChange}
          disabled={disabled}
          style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
          className={cn("gap-2")}
        >
          {options.map((option) => (
            <div key={String(option.value)} className="flex items-center gap-2">
              <RadioGroupItem
                value={String(option.value)}
                id={`radio-${title}-${String(option.value)}`}
                disabled={disabled}
              />
              <Label
                htmlFor={`radio-${title}-${String(option.value)}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {!disabled && value !== null && clearButtonPosition === "input" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleValueChange(null)}
            className="absolute -top-1 -right-1 w-fit h-fit p-0 dark:hover:bg-gray-800"
            disabled={disabled}
          >
            <LucideX size={10} />
          </Button>
        )}
      </div>
    </div>
  );
}
