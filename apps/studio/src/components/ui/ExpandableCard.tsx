import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

function ExpandableCard({
  isExpanded,
  onToggle,
  header,
  description,
  headerRight,
  children,
}: ExpandableCardProps) {
  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center justify-between">
          <div>{header}</div>
          <div className="flex items-center gap-2">
            {headerRight}
            <svg
              className={`w-5 h-5 text-muted-foreground transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">{children}</div>
      )}
    </Card>
  );
}

export { ExpandableCard };

interface ExpandableCardProps {
  isExpanded: boolean;
  onToggle: () => void;
  header: ReactNode;
  description?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}
