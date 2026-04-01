import { Card, CardContent } from "./card";

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-1">
              <span
                className={`text-sm font-medium ${
                  change > 0
                    ? "text-green-600"
                    : change < 0
                      ? "text-red-600"
                      : "text-muted-foreground"
                }`}
              >
                {change > 0 ? "↑" : change < 0 ? "↓" : "→"}{" "}
                {Math.abs(change).toFixed(1)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground ml-1">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
}
