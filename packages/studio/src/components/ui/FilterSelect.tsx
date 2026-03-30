import { type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export function FilterSelect({
  label,
  value,
  onValueChange,
  placeholder,
  options,
  triggerClassName = "w-full text-sm",
  labelClassName = "block text-xs font-medium text-muted-foreground mb-1",
  disabled,
  children,
}: FilterSelectProps) {
  return (
    <div>
      <label className={cn(labelClassName)}>{label}</label>
      <Select
        value={value || ALL}
        onValueChange={(v) => onValueChange(v === ALL ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger className={cn(triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{placeholder}</SelectItem>
          {children ??
            options.map((opt) => {
              const optValue = typeof opt === "string" ? opt : opt.value;
              const optLabel = typeof opt === "string" ? opt : opt.label;
              return (
                <SelectItem key={optValue} value={optValue}>
                  {optLabel}
                </SelectItem>
              );
            })}
        </SelectContent>
      </Select>
    </div>
  );
}

export type FilterSelectOption = string | { value: string; label: string };

export interface FilterSelectProps {
  label: string;
  value: string | undefined;
  onValueChange: (value: string | null) => void;
  placeholder: string;
  options: FilterSelectOption[];
  triggerClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
  children?: ReactNode;
}
