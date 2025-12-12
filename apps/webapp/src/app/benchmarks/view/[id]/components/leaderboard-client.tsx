"use client";

import * as React from "react";
import { ModelLeaderboard } from "@/components/model-leaderboard";
import { ModelLeaderboardRow } from "@/components/model-leaderboard/row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ModelLeaderboardItem } from "@/services/leaderboard.service";
import { useSettingExtra } from "@/lib/hooks/settings/use-setting-extra";

export interface LeaderboardClientProps {
  leaderboardData: ModelLeaderboardItem[];
  totalPromptCount: number;
  showThresholdWarning: boolean;
}

export function LeaderboardClient({
  leaderboardData,
  totalPromptCount,
  showThresholdWarning,
}: LeaderboardClientProps) {
  const [extrasEnabled] = useSettingExtra();
  const recommendedThreshold = React.useMemo(
    () => Math.max(0, Math.ceil(totalPromptCount * 0.7)),
    [totalPromptCount]
  );

  const [minPromptsTested, setMinPromptsTested] = React.useState<number>(
    recommendedThreshold
  );

  const isExtrasEnabled = extrasEnabled === true;

  // If total prompt count changes, keep the default in sync when the control is not visible.
  React.useEffect(() => {
    if (!isExtrasEnabled) {
      setMinPromptsTested(recommendedThreshold);
    }
  }, [isExtrasEnabled, recommendedThreshold]);

  const effectiveMinPromptsTested = isExtrasEnabled
    ? minPromptsTested
    : recommendedThreshold;

  const filtered = React.useMemo(
    () =>
      leaderboardData.filter(
        (item) => item.totalPromptsTested >= effectiveMinPromptsTested
      ),
    [effectiveMinPromptsTested, leaderboardData]
  );

  const clampToRange = React.useCallback(
    (value: number) => Math.max(0, Math.min(totalPromptCount, value)),
    [totalPromptCount]
  );

  return (
    <div>
      {isExtrasEnabled && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Min. Prompts Tested
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Default is 70% of total prompts ({recommendedThreshold}/
                {totalPromptCount})
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-40">
                <Input
                  type="number"
                  value={effectiveMinPromptsTested}
                  min={0}
                  max={totalPromptCount}
                  onChange={(e) => {
                    const next = e.target.value === "" ? 0 : Number(e.target.value);
                    setMinPromptsTested(
                      clampToRange(Number.isFinite(next) ? next : 0)
                    );
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMinPromptsTested(recommendedThreshold)}
              >
                Reset to 70%
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t">
        <ModelLeaderboard>
          {filtered.map((item, index) => (
            <ModelLeaderboardRow
              key={item.model}
              index={index}
              promptCountThreshold={recommendedThreshold}
              showThresholdWarning={showThresholdWarning}
              {...item}
            />
          ))}
        </ModelLeaderboard>
      </div>
    </div>
  );
}


