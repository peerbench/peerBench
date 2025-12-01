import { Card, CardContent } from "@/components/ui/card";
import { LucideFileText, LucideBarChart3, LucideUser } from "lucide-react";

export interface StatsProps {
  totalPromptCount: number;
  totalScoreCount: number;
  totalContributors: number;
  overallAvgScore: number;
}

export function Stats({
  totalPromptCount,
  totalScoreCount,
  totalContributors,
  overallAvgScore,
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
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Total Prompts
              </p>
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
