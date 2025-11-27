"use client";

import { useCallback, useState, useEffect } from "react";

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  values: [number, number] | readonly [number, number];
  onChange?: (values: [number, number]) => void;
  formatValue?: (value: number) => string;
  className?: string;
  disabled?: boolean;
}

export function RangeSlider({
  min,
  max,
  step = 1,
  values,
  onChange,
  formatValue = (value) => value.toString(),
  className = "",
  disabled = false,
}: RangeSliderProps) {
  const [localValues, setLocalValues] = useState(values);

  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const handleChange = useCallback(
    (index: number, newValue: number) => {
      const newValues: [number, number] = [...localValues] as [number, number];
      newValues[index] = newValue;

      // Ensure min value doesn't exceed max value and vice versa
      if (index === 0 && newValue > localValues[1]) {
        newValues[0] = localValues[1];
      } else if (index === 1 && newValue < localValues[0]) {
        newValues[1] = localValues[0];
      }

      setLocalValues(newValues);
      onChange?.(newValues);
    },
    [localValues, onChange]
  );

  // Calculate the progress bar position and width based on actual values
  const progressLeft = ((localValues[0] - min) / (max - min)) * 100;
  const progressWidth = ((localValues[1] - localValues[0]) / (max - min)) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between mb-2">
        <span className="text-md text-muted-foreground">
          {formatValue(localValues[0])}
        </span>
        <span className="text-md text-muted-foreground">
          {formatValue(localValues[1])}
        </span>
      </div>
      <div className="relative h-2">
        {/* Background track */}
        <div className="absolute h-1 w-full rounded-full bg-secondary" />

        {/* Progress track */}
        <div
          className="absolute h-[6px] rounded-full bg-primary"
          style={{
            left: `${progressLeft}%`,
            width: `${progressWidth}%`,
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={localValues[0]}
          onChange={(e) => handleChange(0, Number(e.target.value))}
          className="absolute h-2 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:cursor-pointer"
        />

        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={localValues[1]}
          onChange={(e) => handleChange(1, Number(e.target.value))}
          className="absolute h-2 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );
}
