interface DeltaIndicatorProps {
  current: number;
  previous: number;
  format?: "percent" | "number";
}

export function DeltaIndicator({
  current,
  previous,
  format = "percent",
}: DeltaIndicatorProps) {
  const delta = current - previous;
  const pctChange = previous !== 0 ? (delta / previous) * 100 : 0;

  if (delta === 0) {
    return (
      <span className="inline-flex items-center text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
        → No change
      </span>
    );
  }

  const isUp = delta > 0;
  const className = isUp
    ? "text-green-600 bg-green-50"
    : "text-red-600 bg-red-50";

  const displayValue =
    format === "percent"
      ? `${isUp ? "+" : ""}${pctChange.toFixed(1)}%`
      : `${isUp ? "+" : ""}${delta.toFixed(2)}`;

  return (
    <span
      className={`inline-flex items-center text-sm font-medium px-2 py-0.5 rounded ${className}`}
    >
      {isUp ? "↑" : "↓"} {displayValue}
    </span>
  );
}
