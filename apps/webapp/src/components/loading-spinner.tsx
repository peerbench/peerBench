import { LucideLoader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface LoadingSpinnerProps {
  position?: "fixed" | "block";
}

export default function LoadingSpinner({
  position = "fixed",
}: LoadingSpinnerProps) {
  const containerClasses =
    position === "fixed"
      ? "fixed inset-0 flex items-center justify-center z-50"
      : "relative flex items-center justify-center h-full w-full";

  return (
    <div className={twMerge("bg-opacity-75", containerClasses)}>
      <div className="flex items-center gap-4">
        <LucideLoader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-md text-gray-700 dark:text-gray-200 tracking-wide">
          Loading...
        </span>
      </div>
    </div>
  );
}
