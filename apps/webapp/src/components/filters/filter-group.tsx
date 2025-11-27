"use client";

import { cn } from "@/utils/cn";
import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { LucideInfo } from "lucide-react";

export type FilterGroupProps = {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  tooltip?: ReactNode;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
};

export function FilterGroup({
  title,
  icon: Icon,
  tooltip,
  className,
  children,
  containerClassName,
}: FilterGroupProps) {
  return (
    <div className={cn("space-y-3", containerClassName)}>
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
      <div className={cn(className)}>{children}</div>
    </div>
  );
}
