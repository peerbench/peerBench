import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LucideAlertCircle } from "lucide-react";
import { formatMs } from "peerbench";
import type { ModelLeaderboardItem } from "@/services/leaderboard.service";

export type ModelLeaderboardRowProps = ModelLeaderboardItem & {
  index: number;
  promptCountThreshold?: number;
  showThresholdWarning?: boolean;
};

export function ModelLeaderboardRow({
  index,
  model,
  avgScore,
  totalPromptsTested,
  avgResponseTime,
  promptCountThreshold,
  showThresholdWarning = true,
}: ModelLeaderboardRowProps) {
  return (
    <TableRow className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
      <TableCell className="font-medium">
        <div className="font-bold">{index + 1}</div>
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
          {model}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {avgScore.toFixed(2)}
        </span>
      </TableCell>
      <TableCell className="text-right text-gray-600 dark:text-gray-400">
        <div className="flex items-center justify-end gap-1.5">
          <span>{totalPromptsTested}</span>
          {showThresholdWarning &&
            promptCountThreshold !== undefined &&
            totalPromptsTested < promptCountThreshold && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <LucideAlertCircle className="h-4 w-4 text-orange-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    This model tested fewer than 70% of prompts (
                    {promptCountThreshold.toFixed(0)} required)
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
        </div>
      </TableCell>
      <TableCell className="text-right text-gray-600 dark:text-gray-400">
        {avgResponseTime ? `${formatMs(avgResponseTime)}` : "N/A"}
      </TableCell>
    </TableRow>
  );
}
