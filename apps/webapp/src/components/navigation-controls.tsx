import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NavigationControlsProps {
  currentIndex: number;
  total: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function NavigationControls({
  currentIndex,
  total,
  hasPrevious = true,
  hasNext = true,
  onPrevious,
  onNext,
}: NavigationControlsProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={!hasPrevious || total === 0}
        className="flex items-center gap-2"
        type="button"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {currentIndex + 1} of {total}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!hasNext || total === 0}
        className="flex items-center gap-2"
        type="button"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
