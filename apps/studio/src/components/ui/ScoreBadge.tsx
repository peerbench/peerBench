interface ScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="text-gray-400 text-sm">—</span>
    );
  }

  // Score is 0-1, convert to percentage
  // Score is usually 0-1, but handle cases where it might be 0-100
  const pct = score > 1 ? score : score * 100;

  let colorClass: string;
  if (pct >= 90) {
    colorClass = "bg-green-100 text-green-800 border-green-200";
  } else if (pct >= 75) {
    colorClass = "bg-blue-100 text-blue-800 border-blue-200";
  } else if (pct >= 50) {
    colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
  } else {
    colorClass = "bg-red-100 text-red-800 border-red-200";
  }

  const sizeClass = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${colorClass} ${sizeClass}`}
    >
      {pct.toFixed(1)}%
    </span>
  );
}
