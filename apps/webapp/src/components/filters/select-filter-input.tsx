"use client";

import { useDocumentBody } from "@/lib/hooks/use-document-body";
import {
  reactSelectDisabledStyles,
  reactSelectStyles,
} from "@/lib/styles/react-select-styles";
import { cn } from "@/utils/cn";
import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { LucideInfo } from "lucide-react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";

export type SelectFilterInputOption<TValue = unknown> = {
  value: TValue;
  label: string;
};

export type SelectFilterInputProps<
  TValue = string,
  IsMulti extends boolean = false,
> = {
  value: IsMulti extends true
    ? SelectFilterInputOption<TValue>[]
    : SelectFilterInputOption<TValue> | null;
  onChange: (
    value: IsMulti extends true
      ? SelectFilterInputOption<TValue>[]
      : SelectFilterInputOption<TValue> | null
  ) => void;
  onInputChange?: (inputValue: string) => void;
  label: string;
  isLoading?: boolean;
  isClearable?: boolean;
  isSearchable?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  options: SelectFilterInputOption<TValue>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  tooltip?: ReactNode;
  isMulti?: IsMulti;
  isCreatable?: boolean;
};

export function SelectFilterInput<
  TValue = string,
  IsMulti extends boolean = false,
>({
  value,
  onChange,
  onInputChange,
  isCreatable = false,
  label,
  isLoading = false,
  isClearable = true,
  isSearchable = true,
  icon: Icon,
  className,
  tooltip,
  options,
  placeholder,
  disabled,
  isMulti = false as IsMulti,
}: SelectFilterInputProps<TValue, IsMulti>) {
  const documentEl = useDocumentBody();
  const Component = isCreatable ? CreatableSelect : Select;

  return (
    <div className={cn("space-y-2", className)}>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
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
      <Component<SelectFilterInputOption<TValue>, IsMulti>
        value={value}
        isMulti={isMulti}
        onInputChange={onInputChange}
        onChange={(value) =>
          onChange(
            value as IsMulti extends true
              ? SelectFilterInputOption<TValue>[]
              : SelectFilterInputOption<TValue> | null
          )
        }
        styles={disabled ? reactSelectDisabledStyles : reactSelectStyles}
        menuPortalTarget={documentEl}
        options={options}
        instanceId={`react-select-filter-${label}`}
        placeholder={placeholder}
        isDisabled={disabled}
        isClearable={isClearable}
        isLoading={isLoading}
        isSearchable={isSearchable}
      />
    </div>
  );
}
