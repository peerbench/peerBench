import { Card, CardContent } from "@/components/ui/card";
import {
  LucideFileText,
  LucideBarChart3,
  LucideUser,
  LucideInfo,
} from "lucide-react";
import type { PromptFeedbackStatusCounts } from "@/lib/prompt-feedback-status";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface StatsProps {
  totalPromptCount: number;
  totalScoreCount: number;
  totalContributors: number;
  overallAvgScore: number;
  promptFeedbackStatusCounts?: PromptFeedbackStatusCounts;
}

export function Stats({
  totalPromptCount,
  totalScoreCount,
  totalContributors,
  overallAvgScore,
  promptFeedbackStatusCounts,
}: StatsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <LucideFileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalPromptCount}
              </p>
              <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <span>Total Prompts</span>
                {promptFeedbackStatusCounts && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        aria-label="Prompt status breakdown"
                      >
                        <LucideInfo className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs leading-5 space-y-1 min-w-[220px] text-slate-50">
                        <div className="flex justify-between gap-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Verified: Positive
                          </span>
                          <span className="font-semibold">
                            {promptFeedbackStatusCounts.verified_positive}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Verified: Negative
                          </span>
                          <span className="font-semibold">
                            {promptFeedbackStatusCounts.verified_negative}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-orange-500" />
                            Verified: Mixed
                          </span>
                          <span className="font-semibold">
                            {promptFeedbackStatusCounts.verified_mixed}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-slate-300" />
                            Unverified
                          </span>
                          <span className="font-semibold">
                            {promptFeedbackStatusCounts.unverified}
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <LucideBarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalScoreCount}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Scored Responses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <LucideUser className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalContributors}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Contributors
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <LucideBarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {(overallAvgScore * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Average Overall Score
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
