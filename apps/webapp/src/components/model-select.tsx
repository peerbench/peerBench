"use client";

import { useState, useImperativeHandle, useRef } from "react";
import dynamic from "next/dynamic";
import type {
  Props as SelectProps,
  SingleValue,
  MultiValue,
  MenuPlacement,
} from "react-select";
import Image from "next/image";
import { cn } from "@/utils/cn";
import {
  reactSelectStyles,
  reactSelectDisabledStyles,
} from "@/lib/styles/react-select-styles";
import { formatUsd } from "@/utils/format-usd";
import { LLMProviderModel } from "@/lib/hooks/use-llm-provider";
import Decimal from "decimal.js";

// Types for internal usage
type ModelSelectOptionBase = {
  provider: string;
  value?: string;
  providerLabel: string;
  icon?: string;
  message?: string;
};

export type ModelSelectOptionEnabled = ModelSelectOptionBase &
  LLMProviderModel & {
    disabled?: boolean;
  };
export type ModelSelectOptionDisabled = ModelSelectOptionBase &
  Partial<LLMProviderModel> & {
    disabled: true;
  };

export type ModelSelectOption<CanBeDisabled extends boolean = false> =
  CanBeDisabled extends true
    ? ModelSelectOptionEnabled | ModelSelectOptionDisabled
    : ModelSelectOptionEnabled;

const Select = dynamic<SelectProps<ModelSelectOption, boolean>>(
  () => import("react-select"),
  { ssr: false }
);

export type ModelSelectValue<
  IsMulti extends boolean = true,
  CanBeDisabled extends boolean = false,
> = IsMulti extends true
  ? ModelSelectOption<CanBeDisabled>[]
  : ModelSelectOption<CanBeDisabled> | null;

export interface ModelSelectHandler {
  clear: (triggerChange?: boolean) => void;
}

export interface ModelSelectProps<
  IsMulti extends boolean = true,
  IsDisableSelectionAllowed extends boolean = false,
> {
  options: ModelSelectOption[];
  value?: ModelSelectValue<IsMulti, IsDisableSelectionAllowed>;
  onModelSelected?: (
    selectedOptions: ModelSelectValue<IsMulti, IsDisableSelectionAllowed>
  ) => void;
  disabled?: boolean;
  className?: string;
  isDisableSelectionAllowed?: IsDisableSelectionAllowed;
  isLoading?: boolean;
  isMulti?: IsMulti;
  ref?: React.Ref<ModelSelectHandler> | null;
  menuPlacement?: MenuPlacement;
}

const ModelSelect = <
  IsMulti extends boolean = true,
  IsDisableOptionAllowed extends boolean = false,
>(
  props: ModelSelectProps<IsMulti, IsDisableOptionAllowed>
) => {
  const {
    onModelSelected,
    disabled = false,
    options = [],
    value,
    className,
    isLoading = false,
    isMulti = true as IsMulti,
    ref,
    menuPlacement = "bottom",
    isDisableSelectionAllowed = false as IsDisableOptionAllowed,
  } = props;
  const [internalValue, setInternalValue] = useState<
    ModelSelectValue<IsMulti, IsDisableOptionAllowed>
  >(
    value !== undefined
      ? value
      : getEmptyValue<IsMulti, IsDisableOptionAllowed>(isMulti)
  );

  // Create internal ref if none provided
  const internalRef = useRef<ModelSelectHandler>(null);
  const refToUse = ref || internalRef;

  // Expose clear method to parent component
  useImperativeHandle(refToUse, () => ({
    clear: (triggerChange = true) => {
      const clearedValue = getEmptyValue(isMulti);
      setInternalValue(clearedValue);

      if (triggerChange) {
        onModelSelected?.(clearedValue);
      }
    },
  }));

  const handleModelSelected = (
    selectedModels: ModelSelectValue<IsMulti, IsDisableOptionAllowed>
  ) => {
    if (!isDisableSelectionAllowed) {
      if (isMulti) {
        const models = getSelectedModels(
          selectedModels,
          options,
          isDisableSelectionAllowed
        ) as ModelSelectValue<IsMulti, IsDisableOptionAllowed>;
        setInternalValue(models);
        onModelSelected?.(models);
      } else {
        const model = getSelectedModel(
          selectedModels,
          options,
          isDisableSelectionAllowed
        ) as ModelSelectValue<IsMulti, IsDisableOptionAllowed>;
        setInternalValue(model);
        onModelSelected?.(model);
      }
    } else {
      setInternalValue(selectedModels);
      onModelSelected?.(selectedModels);
    }
  };

  return (
    <div className={className}>
      <Select
        menuPortalTarget={
          typeof window !== "undefined" ? document.body : undefined
        }
        isMulti={isMulti}
        menuPlacement={menuPlacement}
        isLoading={isLoading}
        options={options.map(mapToOption)}
        value={getSelectedValue(
          value !== undefined ? value : internalValue,
          options,
          isMulti,
          isDisableSelectionAllowed
        )}
        onChange={(selected) =>
          handleModelSelected(convertReactSelectValue(selected, isMulti))
        }
        className="react-select-container"
        classNamePrefix="react-select"
        placeholder={isMulti ? "Select models..." : "Select a model..."}
        noOptionsMessage={() => "No models available"}
        closeMenuOnSelect={!isMulti}
        hideSelectedOptions={!isMulti}
        blurInputOnSelect={!isMulti}
        isSearchable={true}
        isDisabled={disabled || isLoading}
        formatOptionLabel={(option, { context }) =>
          context === "menu" ? (
            <ModelOption option={option} />
          ) : (
            <SelectedModelOption option={option} />
          )
        }
        styles={
          disabled || isLoading ? reactSelectDisabledStyles : reactSelectStyles
        }
      />
    </div>
  );
};

function ModelOption({ option }: { option: ModelSelectOption }) {
  const inputCost = safeDecimal(option.perMillionTokenInputCost);
  const outputCost = safeDecimal(option.perMillionTokenOutputCost);
  const isFree =
    (inputCost && inputCost.isZero()) || (outputCost && outputCost.isZero());

  return (
    <div className="flex items-center gap-3">
      {option.icon && (
        <div className="w-5 h-5 relative">
          <Image
            src={option.icon}
            alt={`${option.provider} logo`}
            fill
            className="object-contain"
          />
        </div>
      )}
      <div
        className={cn("flex flex-col", {
          "text-gray-400": option.disabled,
        })}
      >
        <span className="font-medium">
          {option.modelId || option.message || "N/A"}
        </span>
        <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-500 flex-wrap">
          <span>{option.providerLabel}</span>
          <div className="flex items-center gap-2 text-xs">
            {isFree ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                Free
              </span>
            ) : (
              inputCost &&
              outputCost && (
                <>
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800">
                    Input: {formatUsd(inputCost!)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800">
                    Output: {formatUsd(outputCost!)}
                  </span>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectedModelOption({ option }: { option: ModelSelectOption }) {
  return (
    <div className="flex items-center gap-2">
      {option.icon && (
        <div className="w-4 h-4 relative">
          <Image
            src={option.icon}
            alt={`${option.provider} logo`}
            fill
            className="object-contain"
          />
        </div>
      )}
      <span className="text-sm">
        {option.modelId || option.message || "N/A"}
      </span>
    </div>
  );
}

const safeDecimal = (val?: string | null) => {
  try {
    if (!val) return null;
    const d = new Decimal(val);
    if (!d.isFinite()) return null;
    return d;
  } catch {
    return null;
  }
};

const mapToOption = (
  model: ModelSelectOption,
  i: number
): ModelSelectOption => ({
  ...model,

  // Make a unique option value for react-select so it can
  // be used as a key if there is no defined one
  value:
    model.value ||
    `${model.provider || model.providerLabel}:${model.modelId || i}`,
});

const getEmptyValue = <
  IsMulti extends boolean,
  IsDisableOptionAllowed extends boolean,
>(
  isMulti: IsMulti
): ModelSelectValue<IsMulti, IsDisableOptionAllowed> => {
  return (isMulti ? [] : null) as ModelSelectValue<
    IsMulti,
    IsDisableOptionAllowed
  >;
};

const getSelectedModels = (
  value: ModelSelectValue<boolean, boolean>,
  options: ModelSelectOption[],
  isDisableOptionAllowed: boolean
): ModelSelectOption[] => {
  const selectedArray = Array.isArray(value) ? value : [];
  return options
    .filter((model) =>
      selectedArray.some(
        (selected) =>
          selected.provider === model.provider &&
          selected.modelId === model.modelId &&
          (isDisableOptionAllowed ? true : !selected.disabled)
      )
    )
    .map(mapToOption);
};

const getSelectedModel = (
  value: ModelSelectValue<boolean, boolean>,
  options: ModelSelectOption[],
  isDisableOptionAllowed: boolean
): ModelSelectOption | null => {
  const selectedSingle = Array.isArray(value) ? value[0] : value;
  if (!selectedSingle) return null;

  const model = options.find(
    (m) =>
      m.provider === selectedSingle.provider &&
      m.modelId === selectedSingle.modelId &&
      (isDisableOptionAllowed ? true : !m.disabled)
  );
  return model ? mapToOption(model, 0) : null;
};

const getSelectedValue = <
  IsMulti extends boolean,
  IsDisableOptionAllowed extends boolean,
>(
  value: ModelSelectValue<IsMulti, IsDisableOptionAllowed>,
  options: ModelSelectOption[],
  isMulti: IsMulti,
  isDisableOptionAllowed: IsDisableOptionAllowed
) => {
  if (isMulti) {
    return getSelectedModels(value, options, isDisableOptionAllowed);
  }

  return getSelectedModel(value, options, isDisableOptionAllowed);
};

const convertReactSelectValue = <
  IsMulti extends boolean,
  IsDisableOptionAllowed extends boolean,
>(
  selected: SingleValue<ModelSelectOption> | MultiValue<ModelSelectOption>,
  isMulti: IsMulti
): ModelSelectValue<IsMulti, IsDisableOptionAllowed> => {
  if (isMulti) {
    return (Array.isArray(selected) ? [...selected] : []) as ModelSelectValue<
      IsMulti,
      IsDisableOptionAllowed
    >;
  } else {
    return (
      Array.isArray(selected) ? selected[0] || null : selected
    ) as ModelSelectValue<IsMulti, IsDisableOptionAllowed>;
  }
};

ModelSelect.displayName = "ModelSelect";
export default ModelSelect;
