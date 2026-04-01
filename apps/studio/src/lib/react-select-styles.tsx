import type { CSSObjectWithLabel, StylesConfig } from "react-select";
import type { ReactNode } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const selectClassNames: any = {
  control: ({ isFocused }: { isFocused: boolean }) =>
    [
      "!min-h-9 !rounded-md !border-input !bg-transparent !shadow-xs !text-sm !cursor-default",
      isFocused
        ? "!border-ring !ring-ring/50 !ring-[3px]"
        : "hover:!border-input",
    ].join(" "),
  menu: () =>
    "!bg-popover !text-popover-foreground !rounded-md !border !shadow-md !z-50 !mt-1",
  menuList: () => "!p-1 !max-h-72",
  option: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) =>
    [
      "!rounded-sm !py-1.5 !px-2 !text-sm !cursor-default",
      isSelected
        ? "!bg-accent !text-accent-foreground"
        : isFocused
          ? "!bg-accent !text-accent-foreground"
          : "!bg-transparent",
    ].join(" "),
  singleValue: () => "!text-foreground",
  placeholder: () => "!text-muted-foreground",
  input: () => "!text-foreground",
  indicatorSeparator: () => "!hidden",
  dropdownIndicator: () => "!text-muted-foreground/50 !p-1",
  clearIndicator: () =>
    "!text-muted-foreground hover:!text-foreground !p-1 !cursor-pointer",
  multiValue: () => "!bg-accent !rounded",
  multiValueLabel: () => "!text-foreground !text-xs",
  multiValueRemove: () =>
    "!text-muted-foreground hover:!text-foreground hover:!bg-accent !rounded-r !cursor-pointer",
  valueContainer: () => "!gap-1 !px-3",
  noOptionsMessage: () => "!text-muted-foreground !text-sm !py-2",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const selectStyles: StylesConfig<any, any> = {
  control: (base) => ({ ...base, minHeight: 36 }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
};

export function selectStylesWithError(
  hasError: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): StylesConfig<any, any> {
  if (!hasError) return selectStyles;
  return {
    ...selectStyles,
    control: (base: CSSObjectWithLabel) => ({
      ...base,
      minHeight: 36,
      borderColor: "hsl(var(--destructive))",
    }),
  };
}

export function formatOptionWithDescription(
  option: DescribedOption,
  meta: { context: "menu" | "value" },
): ReactNode {
  if (meta.context === "value") return option.label;
  return (
    <div>
      <div>{option.label}</div>
      {option.description && (
        <div className="text-xs text-muted-foreground font-normal">
          {option.description}
        </div>
      )}
    </div>
  );
}

export interface DescribedOption {
  value: string;
  label: string;
  description?: string;
}
