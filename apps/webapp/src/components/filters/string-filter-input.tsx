"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { Info, LucideX } from "lucide-react";
import { cn } from "@/utils/cn";
import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type StringFilterInputProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  isDirty: boolean;
  error?: string | null;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  clearButtonPosition?: "title" | "input";
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  tooltip?: ReactNode;
};

export function StringFilterInput({
  value,
  onChange,
  onClear,
  isDirty,
  error,
  placeholder,
  disabled,
  label,
  icon: Icon,
  clearButtonPosition = "title",
  className,
  tooltip,
}: StringFilterInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
          {Icon && <Icon className="w-4 h-4" />}
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
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full"
          inputClassName="bg-background"
          disabled={disabled}
        />
        {!disabled && isDirty && clearButtonPosition === "input" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-fit h-fit p-0 dark:hover:bg-gray-800"
            disabled={disabled}
          >
            <LucideX size={10} />
          </Button>
        )}
      </div>
      {error && isDirty && (
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
